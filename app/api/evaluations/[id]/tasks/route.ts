import {prisma} from "../../../../../lib/prisma.ts";
import {buildTaskDraftCreateInput, jsonResponse, type CreateTaskDraftInput} from "../../../../../lib/evaluation-db.ts";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = (await request.json()) as Partial<CreateTaskDraftInput>;

    if (
      typeof body.clientTaskId !== "string" ||
      typeof body.taskId !== "string" ||
      typeof body.difficulty !== "string" ||
      typeof body.startTime !== "number" ||
      typeof body.initialCode !== "string"
    ) {
      return jsonResponse({error: "Invalid task draft payload"}, {status: 400});
    }

    const task = await prisma.completedTask.upsert({
      where: {
        sessionId_clientTaskId: {
          sessionId: id,
          clientTaskId: body.clientTaskId,
        },
      },
      create: buildTaskDraftCreateInput(id, {
        clientTaskId: body.clientTaskId,
        taskId: body.taskId,
        difficulty: body.difficulty,
        startTime: body.startTime,
        initialCode: body.initialCode,
        latestCode: typeof body.latestCode === "string" ? body.latestCode : undefined,
      }),
      update: {
        latestCode: typeof body.latestCode === "string" ? body.latestCode : body.initialCode,
        lastCheckpointTime: new Date(body.startTime),
      },
      select: {
        id: true,
      },
    });

    return jsonResponse({id: task.id}, {status: 201});
  } catch (error) {
    console.error("Failed to create task draft:", error);
    return jsonResponse({error: "Failed to create task draft"}, {status: 500});
  }
}
