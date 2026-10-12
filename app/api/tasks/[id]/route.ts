import {prisma} from "../../../../lib/prisma.ts";
import {jsonResponse} from "../../../../lib/evaluation-db.ts";

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const task = await prisma.studyTask.findUnique({where: {id}});

    if (!task) {
      return jsonResponse({error: "Task not found"}, {status: 404});
    }

    return jsonResponse({
      id: task.id,
      title: task.title,
      summary: task.summary,
      series: task.series,
      tags: task.tags,
      difficulty: task.difficulty,
      code: task.code,
    });
  } catch (error) {
    console.error("Failed to fetch study task:", error);
    return jsonResponse({error: "Failed to fetch study task"}, {status: 500});
  }
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = await request.json();

    const existing = await prisma.studyTask.findUnique({where: {id}});
    if (!existing) {
      return jsonResponse({error: "Task not found"}, {status: 404});
    }

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.summary === "string") data.summary = body.summary;
    if (typeof body.series === "string") data.series = body.series;
    if (Array.isArray(body.tags)) data.tags = body.tags;
    if (typeof body.difficulty === "string") data.difficulty = body.difficulty;
    if (typeof body.code === "string") data.code = body.code;

    const task = await prisma.studyTask.update({where: {id}, data});

    return jsonResponse({
      id: task.id,
      title: task.title,
      summary: task.summary,
      series: task.series,
      tags: task.tags,
      difficulty: task.difficulty,
      code: task.code,
    });
  } catch (error) {
    console.error("Failed to update study task:", error);
    return jsonResponse({error: "Failed to update study task"}, {status: 500});
  }
}

export async function DELETE(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;

    const existing = await prisma.studyTask.findUnique({where: {id}});
    if (!existing) {
      return jsonResponse({error: "Task not found"}, {status: 404});
    }

    await prisma.studyTask.delete({where: {id}});
    return jsonResponse({ok: true});
  } catch (error) {
    console.error("Failed to delete study task:", error);
    return jsonResponse({error: "Failed to delete study task"}, {status: 500});
  }
}
