import {promises as fs} from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data", "evaluations");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, {recursive: true});
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type": "application/json"},
  });
}

export async function GET() {
  try {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    const evaluations = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf-8"));
      // Return summary only (no full transaction/mouse data)
      evaluations.push({
        id: data.id,
        participantName: data.participantName,
        participantId: data.participantId,
        sessionStartTime: data.sessionStartTime,
        sessionEndTime: data.sessionEndTime,
        taskCount: data.tasks?.length ?? 0,
        hasQuestionnaire: !!data.questionnaire,
      });
    }
    evaluations.sort((a: {sessionStartTime: number}, b: {sessionStartTime: number}) =>
      b.sessionStartTime - a.sessionStartTime,
    );
    return json(evaluations);
  } catch (e) {
    console.error("Failed to list evaluations:", e);
    return json({error: "Failed to list evaluations"}, 500);
  }
}

export async function POST(request: Request) {
  try {
    const {participantName, participantId} = await request.json();
    const id = crypto.randomUUID();

    await ensureDir();

    const evaluation = {
      id,
      participantName,
      participantId,
      sessionStartTime: Date.now(),
      sessionEndTime: null,
      tasks: [] as unknown[],
    };

    await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(evaluation, null, 2));

    return json({id});
  } catch (e) {
    console.error("Failed to create evaluation:", e);
    return json({error: "Failed to create evaluation"}, 500);
  }
}
