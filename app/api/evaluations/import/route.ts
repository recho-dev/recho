import {prisma} from "../../../../lib/prisma.ts";
import {
  buildImportedSessionCreateInput,
  buildImportedTaskCreateInput,
  buildImportedTransactionBatch,
  buildPauseEventBatch,
  jsonResponse,
  normalizeImportSessions,
} from "../../../../lib/evaluation-db.ts";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const sessions = normalizeImportSessions(payload);
    const sessionIds = sessions.map((session) => session.id).filter((id): id is string => typeof id === "string");

    const existingSessions =
      sessionIds.length > 0
        ? await prisma.evaluationSession.findMany({
            where: {
              id: {
                in: sessionIds,
              },
            },
            select: {
              id: true,
            },
          })
        : [];

    const existingIds = new Set(existingSessions.map((session) => session.id));
    let importedCount = 0;
    let skippedCount = 0;

    for (const session of sessions) {
      if (session.id && existingIds.has(session.id)) {
        skippedCount += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const createdSession = await tx.evaluationSession.create({
          data: buildImportedSessionCreateInput(session),
          select: {
            id: true,
          },
        });

        for (const task of session.tasks ?? []) {
          const createdTask = await tx.completedTask.create({
            data: buildImportedTaskCreateInput(createdSession.id, task),
            select: {
              id: true,
            },
          });

          const transactions = Array.isArray(task.transactions) ? task.transactions : [];
          if (transactions.length > 0) {
            await tx.transactionRecord.createMany({
              data: buildImportedTransactionBatch(createdTask.id, transactions),
            });
          }

          const pauseEvents = Array.isArray(task.pauseEvents) ? task.pauseEvents : [];
          if (pauseEvents.length > 0) {
            await tx.pauseEvent.createMany({
              data: buildPauseEventBatch(createdTask.id, pauseEvents),
            });
          }
        }
      });

      importedCount += 1;
    }

    return jsonResponse({
      ok: true,
      importedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Failed to import evaluations:", error);
    return jsonResponse({error: "Failed to import evaluations"}, {status: 500});
  }
}
