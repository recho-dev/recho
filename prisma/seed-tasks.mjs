#!/usr/bin/env node
/**
 * Seed script: reads task JSON files from prisma/seed-tasks/ and upserts
 * them via the Next.js API.
 *
 * Usage:
 *   node prisma/seed-tasks.mjs [--base-url http://localhost:3001]
 */

import {readdir, readFile} from "node:fs/promises";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, "seed-tasks");

const baseUrl = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3001";

async function main() {
  const files = (await readdir(SEED_DIR)).filter((f) => f.endsWith(".json")).sort();

  console.log(`Found ${files.length} task files in ${SEED_DIR}`);
  console.log(`Using API at ${baseUrl}\n`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const file of files) {
    const path = join(SEED_DIR, file);
    const raw = await readFile(path, "utf-8");
    const task = JSON.parse(raw);
    const id = String(task.id);

    // Check if it already exists
    const getRes = await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(id)}`);

    if (getRes.ok) {
      // Update existing task
      const patchRes = await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(task),
      });

      if (patchRes.ok) {
        console.log(`  ↻ Updated task ${id}: ${task.title}`);
        updated++;
      } else {
        const err = await patchRes.text();
        console.error(`  ✗ Failed to update task ${id}: ${err}`);
        errors++;
      }
    } else {
      // Create new task
      const postRes = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...task, id}),
      });

      if (postRes.ok) {
        console.log(`  ✓ Created task ${id}: ${task.title}`);
        created++;
      } else {
        const err = await postRes.text();
        console.error(`  ✗ Failed to create task ${id}: ${err}`);
        errors++;
      }
    }
  }

  console.log(`\nDone: ${created} created, ${updated} updated, ${errors} errors`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
