import {generate} from "short-uuid";
import {collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch} from "firebase/firestore";
import {getFirebase} from "./firebase.js";
import {predicates, objects} from "friendly-words";

const LEGACY_FILE_NAME = "obs-files";

const FILE_NAME = "recho-files";

const DEFAULT_RUNTIME = "javascript@0.1.0";

export const PRIVATE = "private";

export const PUBLIC = "public";

function generateProjectName() {
  const adj = predicates[~~(Math.random() * predicates.length)];
  const obj = objects[~~(Math.random() * objects.length)];
  return `${adj}-${obj}.js`;
}

const DEFAULT_CONTENT = `
/*
** Welcome to
**  ___        _
** | _ \\___ __| |_  ___
** |   / -_) _| ' \\/ _ \\
** |_|_\\___\\__|_||_\\___/
**
** A reactive editor for algorithms and ASCII art.
*/

// 1. You can call echo(value) to echo output inline as comments, which allows
// you to better understand the code by "seeing" every manipulation in-situ.

const text = echo("dog");

const chars = echo(text.split(""));

echo(chars.slice().reverse().join(""));

// 2. You can also call recho.interval(ms) to create data-driven animations,
// which can help you find the minimalism of ASCII art is fascinating!

const x = recho.interval(100);

echo("🚗💨".padStart(40 - (x % 40)));

// 3. Inputs are also supported, which can help you create interactive
// notebooks. Click the buttons to see what happens!

const x1 = recho.number(10, {min: 0, max: 40, step: 1});

//➜ "(๑•̀ㅂ•́)و✧"
echo("~".repeat(x1) + "(๑•̀ㅂ•́)و✧");

// Refer to the links (cmd/ctrl + click) to learn more about Recho:
// - Docs: https://recho.dev/docs
// - Examples: https://recho.dev/examples
// - Github: https://github.com/recho-dev/notebook
`;

export function createNotebook() {
  return {
    id: generate(),
    title: generateProjectName(),
    created: null,
    updated: null,
    content: DEFAULT_CONTENT.trimStart(),
    autoRun: true,
    runtime: DEFAULT_RUNTIME,
    visibility: PRIVATE,
  };
}

// Local notebooks are from before cloud storage. They are read-only and
// uploaded to the cloud once the user logs in.

function saveLocalNotebooks(notebooks) {
  localStorage.setItem(FILE_NAME, JSON.stringify(notebooks));
}

function renameLegacyNotebooks() {
  const legacyNotebooks = localStorage.getItem(LEGACY_FILE_NAME);
  if (!legacyNotebooks) return;
  saveLocalNotebooks(JSON.parse(legacyNotebooks));
  localStorage.removeItem(LEGACY_FILE_NAME);
}

function getLocalNotebooks() {
  renameLegacyNotebooks();
  const files = localStorage.getItem(FILE_NAME);
  if (!files) return [];
  return JSON.parse(files).sort((a, b) => new Date(b.updated) - new Date(a.updated));
}

export function clearNotebooksFromLocalStorage() {
  localStorage.removeItem(FILE_NAME);
}

function normalizeNotebook(notebook) {
  // Remove fallback runtime when we have breaking changes.
  const newNotebook = {...notebook, runtime: DEFAULT_RUNTIME, visibility: notebook.visibility ?? PRIVATE};
  // Add fallback created timestamp.
  if (!newNotebook.created) newNotebook.created = new Date().toISOString();
  return newNotebook;
}

// Cloud notebooks are stored at notebooks/{id} with an owner and a
// visibility. Public notebooks can be read by anyone with the link.

function currentUser() {
  return getFirebase().auth.currentUser;
}

function requireUser() {
  const user = currentUser();
  if (!user) throw new Error("Log in to save notebooks.");
  return user;
}

function notebookDoc(id) {
  return doc(getFirebase().db, "notebooks", id);
}

function ownedNotebooks(user) {
  return query(collection(getFirebase().db, "notebooks"), where("ownerId", "==", user.uid));
}

function toDoc(user, notebook) {
  return {
    ownerId: user.uid,
    visibility: notebook.visibility ?? PRIVATE,
    title: notebook.title,
    content: notebook.content,
    autoRun: notebook.autoRun ?? true,
    runtime: notebook.runtime ?? DEFAULT_RUNTIME,
    created: notebook.created,
    updated: notebook.updated ?? notebook.created,
  };
}

function writeNotebook(user, notebook) {
  return setDoc(notebookDoc(notebook.id), toDoc(user, notebook));
}

export async function getNotebooks() {
  const user = currentUser();
  const localNotebooks = getLocalNotebooks();
  if (!user) return localNotebooks.map(normalizeNotebook);
  const snapshot = await getDocs(ownedNotebooks(user));
  const notebooks = snapshot.docs.map((d) => ({...d.data(), id: d.id}));
  // Local notebooks are left behind if uploading them failed.
  // Keep listing them until the upload is retried successfully.
  const ids = new Set(notebooks.map((notebook) => notebook.id));
  const leftovers = localNotebooks.filter((notebook) => !ids.has(notebook.id));
  return [...notebooks, ...leftovers].sort((a, b) => new Date(b.updated) - new Date(a.updated)).map(normalizeNotebook);
}

export async function getNotebookById(id) {
  let notebook;
  try {
    const snapshot = await getDoc(notebookDoc(id));
    notebook = snapshot.exists() ? {...snapshot.data(), id} : undefined;
  } catch (error) {
    // The rules deny reading someone else's private notebook, and also a
    // notebook that doesn't exist. Both are reported as not found.
    if (error.code !== "permission-denied") throw error;
  }
  // Fall back to local notebooks, including ones that failed to upload.
  notebook ??= getLocalNotebooks().find((f) => f.id === id);
  if (!notebook) return undefined;
  // Don't auto run if the last run never finished, e.g. an infinite loop froze the page.
  return {...normalizeNotebook(notebook), autoRun: !isRunning(id)};
}

export async function deleteNotebook(id) {
  if (!confirm("Are you sure you want to delete this notebook?")) return false;
  requireUser();
  await deleteDoc(notebookDoc(id));
  // Also delete a local copy that failed to upload, so it doesn't reappear.
  const localNotebooks = getLocalNotebooks();
  if (localNotebooks.some((f) => f.id === id)) saveLocalNotebooks(localNotebooks.filter((f) => f.id !== id));
  return true;
}

export async function addNotebook(notebook) {
  const time = new Date().toISOString();
  await writeNotebook(requireUser(), {...notebook, created: time, updated: time});
}

export async function saveNotebook(notebook) {
  if (pendingSave?.notebook.id === notebook.id) {
    clearTimeout(pendingSave.timer);
    pendingSave = null;
  }
  const time = new Date().toISOString();
  // Prevent creating a new notebook if the created timestamp is not set.
  await writeNotebook(requireUser(), {...notebook, created: notebook.created ?? time, updated: time});
}

const SAVE_DELAY = 800;

const RETRY_DELAY = 5000;

let pendingSave = null;

let savesInFlight = 0;

// Save on typing without writing to the cloud on every keystroke.
export function saveNotebookDebounced(notebook) {
  if (pendingSave?.notebook.id === notebook.id) clearTimeout(pendingSave.timer);
  else flushPendingSave();
  pendingSave = {notebook, timer: setTimeout(flushPendingSave, SAVE_DELAY)};
}

export function flushPendingSave() {
  if (!pendingSave) return;
  const {notebook, timer} = pendingSave;
  clearTimeout(timer);
  pendingSave = null;
  savesInFlight++;
  saveNotebook(notebook)
    .catch((error) => {
      console.error("Failed to save notebook, retrying", error);
      // Retry unless a newer change is already queued or the user logged out.
      if (!pendingSave && currentUser()) {
        pendingSave = {notebook, timer: setTimeout(flushPendingSave, RETRY_DELAY)};
      }
    })
    .finally(() => savesInFlight--);
}

// Whether some edits are queued, being written, or waiting for a retry.
export function hasUnsavedChanges() {
  return pendingSave !== null || savesInFlight > 0;
}

// Batched writes are limited to 500 operations.
const BATCH_SIZE = 500;

async function commitInBatches(items, apply) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(getFirebase().db);
    for (const item of items.slice(i, i + BATCH_SIZE)) apply(batch, item);
    await batch.commit();
  }
}

export async function uploadLocalNotebooks(user) {
  const localNotebooks = getLocalNotebooks();
  if (localNotebooks.length === 0) return 0;
  // Skip notebooks already in the cloud, so a retried upload never
  // overwrites newer cloud edits with a stale local copy.
  const existing = await getDocs(ownedNotebooks(user));
  const ids = new Set(existing.docs.map((d) => d.id));
  const notebooks = localNotebooks.filter((notebook) => !ids.has(notebook.id)).map(normalizeNotebook);
  await commitInBatches(notebooks, (batch, notebook) => batch.set(notebookDoc(notebook.id), toDoc(user, notebook)));
  clearNotebooksFromLocalStorage();
  return notebooks.length;
}

// Notebooks used to be stored at users/{uid}/notebooks/{id}. Move them to
// notebooks/{id} as private notebooks, then delete the old copies.
//
// A notebook already moved is only overwritten by a newer old copy, e.g. one
// edited on a site still running the old code, or a retry after a failure.
// It keeps its visibility.
export async function migrateLegacyNotebooks(user) {
  const legacy = await getDocs(collection(getFirebase().db, "users", user.uid, "notebooks"));
  if (legacy.empty) return 0;
  const existing = new Map((await getDocs(ownedNotebooks(user))).docs.map((d) => [d.id, d.data()]));
  const notebooks = legacy.docs
    .map((d) => ({...d.data(), id: d.id}))
    .filter((notebook) => {
      const moved = existing.get(notebook.id);
      return !moved || new Date(notebook.updated) > new Date(moved.updated);
    });
  await commitInBatches(notebooks, (batch, notebook) => {
    const visibility = existing.get(notebook.id)?.visibility ?? PRIVATE;
    batch.set(notebookDoc(notebook.id), toDoc(user, {...notebook, visibility}));
  });
  await commitInBatches(legacy.docs, (batch, d) => batch.delete(d.ref));
  return notebooks.length;
}

// A run is marked before it starts and unmarked shortly after. If the mark
// is still there when the notebook is opened, the last run froze the page.

const RUNNING_KEY = "recho-running";

function isRunning(id) {
  return localStorage.getItem(`${RUNNING_KEY}-${id}`) !== null;
}

export function markRunning(id) {
  localStorage.setItem(`${RUNNING_KEY}-${id}`, "true");
}

export function clearRunning(id) {
  localStorage.removeItem(`${RUNNING_KEY}-${id}`);
}

export function generateDuplicateName(originalName) {
  // Handle names with extension like "[NAME].js" -> "[NAME] copy.js"
  const lastDotIndex = originalName.lastIndexOf(".");
  if (lastDotIndex > 0) {
    const name = originalName.substring(0, lastDotIndex);
    const extension = originalName.substring(lastDotIndex);
    return `${name} copy${extension}`;
  }
  // Handle names without extension like "NAME" -> "NAME copy"
  return `${originalName} copy`;
}

export function duplicateNotebook(sourceNotebook) {
  const newNotebook = createNotebook();
  const duplicatedTitle = generateDuplicateName(sourceNotebook.title);
  return {
    ...newNotebook,
    title: duplicatedTitle,
    content: sourceNotebook.content,
    autoRun: sourceNotebook.autoRun,
  };
}
