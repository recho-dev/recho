import {prisma} from "../../../lib/prisma.ts";
import {jsonResponse} from "../../../lib/evaluation-db.ts";

export async function GET() {
  try {
    const tasks = await prisma.studyTask.findMany({
      orderBy: {id: "asc"},
    });

    return jsonResponse(
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        summary: task.summary,
        series: task.series,
        tags: task.tags,
        difficulty: task.difficulty,
        code: task.code,
      })),
    );
  } catch (error) {
    console.error("Failed to list study tasks:", error);
    return jsonResponse({error: "Failed to list study tasks"}, {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {id, title, summary, series, tags, difficulty, code} = body;

    if (!id || !title || !summary || !series || !difficulty || !code) {
      return jsonResponse({error: "Missing required fields"}, {status: 400});
    }

    const task = await prisma.studyTask.create({
      data: {
        id,
        title,
        summary,
        series,
        tags: Array.isArray(tags) ? tags : [],
        difficulty,
        code,
      },
    });

    return jsonResponse(task, {status: 201});
  } catch (error) {
    console.error("Failed to create study task:", error);
    return jsonResponse({error: "Failed to create study task"}, {status: 500});
  }
}
