import {readdir, readFile} from "node:fs/promises";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {PrismaClient} from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, "seed-tasks");
const prisma = new PrismaClient();

async function main() {
  // Only seed if the table is empty — never overwrite existing data.
  const existing = await prisma.studyTask.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} tasks already exist.`);
    return;
  }

  console.log("Seeding study tasks (first-time setup)...");

  const files = (await readdir(SEED_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();

  for (const file of files) {
    const raw = await readFile(join(SEED_DIR, file), "utf-8");
    const task = JSON.parse(raw);

    await prisma.studyTask.create({
      data: {
        id: String(task.id),
        title: task.title,
        summary: task.summary,
        series: task.series,
        tags: Array.isArray(task.tags) ? task.tags : [],
        difficulty: task.difficulty,
        code: task.code,
      },
    });
    console.log(`  Created task ${task.id}: ${task.title}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
