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
