import {promises as fs} from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "evaluations");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type": "application/json"},
  });
}

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const task = await request.json();

    const data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    data.tasks.push(task);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return json({ok: true});
  } catch (e) {
    console.error("Failed to append task:", e);
    return json({error: "Failed to append task"}, 500);
  }
}
