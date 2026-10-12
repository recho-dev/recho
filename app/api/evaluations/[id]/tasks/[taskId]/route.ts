import {prisma} from "../../../../../../lib/prisma.ts";
import {
  buildTaskCheckpointUpdate,
  buildTransactionBatch,
  jsonResponse,
  type TaskCheckpointInput,
} from "../../../../../../lib/evaluation-db.ts";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string; taskId: string}>}) {
  try {
    const {id, taskId} = await params;
    const body = (await request.json()) as TaskCheckpointInput;

    const task = await prisma.completedTask.findFirst({
      where: {
        id: taskId,
        sessionId: id,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      return jsonResponse({error: "Task not found"}, {status: 404});
    }

    const transactions = Array.isArray(body.transactions) ? body.transactions : [];
    const pauseEvents = Array.isArray(body.pauseEvents) ? body.pauseEvents : [];
    const updateData = buildTaskCheckpointUpdate(body);

    await prisma.$transaction(async (tx) => {
      if (transactions.length > 0) {
        await tx.transactionRecord.createMany({
          data: buildTransactionBatch(taskId, transactions),
          skipDuplicates: true,
        });
      }

      if (pauseEvents.length > 0) {
        for (const pauseEvent of pauseEvents) {
          await tx.pauseEvent.upsert({
            where: {
              completedTaskId_pausedAt: {
                completedTaskId: taskId,
                pausedAt: new Date(pauseEvent.pausedAt),
              },
            },
            create: {
              completedTaskId: taskId,
              pausedAt: new Date(pauseEvent.pausedAt),
              resumedAt: pauseEvent.resumedAt == null ? null : new Date(pauseEvent.resumedAt),
              reason: pauseEvent.reason,
            },
            update: {
              resumedAt: pauseEvent.resumedAt == null ? null : new Date(pauseEvent.resumedAt),
              reason: pauseEvent.reason,
            },
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        await tx.completedTask.update({
          where: {
            id: taskId,
          },
          data: updateData,
        });
      }
    });

    return jsonResponse({ok: true});
  } catch (error) {
    console.error("Failed to update task checkpoint:", error);
    return jsonResponse({error: "Failed to update task checkpoint"}, {status: 500});
  }
}
