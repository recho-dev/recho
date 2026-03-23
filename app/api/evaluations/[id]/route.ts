import {promises as fs} from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "evaluations");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type": "application/json"},
  });
}

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    return json(JSON.parse(data));
  } catch (e) {
    console.error("Failed to read evaluation:", e);
    return json({error: "Evaluation not found"}, 404);
  }
}

export async function PUT(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const body = await request.json();

    const data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    if (body.sessionEndTime != null) {
      data.sessionEndTime = body.sessionEndTime;
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return json({ok: true});
  } catch (e) {
    console.error("Failed to update evaluation:", e);
    return json({error: "Failed to update evaluation"}, 500);
  }
}
