/**
 * Turns every "public" notebook into an "unlisted" one.
 *
 * "public" used to mean "anyone with the link can view", which is now
 * "unlisted"; "public" notebooks are also listed on the Explore page. Run this
 * once so nothing is listed without its owner choosing to.
 *
 * Deploy order:
 * 1. firebase deploy --only firestore:rules
 * 2. node scripts/migrate-public-to-unlisted.js --dry-run
 * 3. node scripts/migrate-public-to-unlisted.js
 * 4. Deploy the app.
 *
 * Credentials come from Application Default Credentials, e.g.
 * `gcloud auth application-default login` or GOOGLE_APPLICATION_CREDENTIALS
 * pointing to a service account key.
 */
import {applicationDefault, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "recho-dev";

// Batched writes are limited to 500 operations.
const BATCH_SIZE = 500;

const dryRun = process.argv.includes("--dry-run");

initializeApp({credential: applicationDefault(), projectId: PROJECT_ID});
const db = getFirestore();

const snapshot = await db.collection("notebooks").where("visibility", "==", "public").get();
console.log(`Found ${snapshot.size} public notebook(s) in ${PROJECT_ID}.`);

if (dryRun) {
  for (const doc of snapshot.docs) console.log(`- ${doc.id} ${doc.get("title")}`);
  console.log("Dry run, nothing changed.");
} else {
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of snapshot.docs.slice(i, i + BATCH_SIZE)) batch.update(doc.ref, {visibility: "unlisted"});
    await batch.commit();
  }
  console.log(`Made ${snapshot.size} notebook(s) unlisted.`);
}
