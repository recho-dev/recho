// Deleting a notebook while its autosave is queued, being written or retrying must not write it back.
import {it, expect, vi, beforeEach, afterEach} from "vitest";

const store = vi.hoisted(() => ({setDoc: null, deleteDoc: null}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: (db, collection, id) => ({id}),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  setDoc: (...args) => store.setDoc(...args),
  deleteDoc: (...args) => store.deleteDoc(...args),
}));
vi.mock("../app/firebase.js", () => ({
  getFirebase: () => ({
    db: {},
    auth: {currentUser: {uid: "me", getIdTokenResult: async () => ({claims: {}})}},
  }),
}));
vi.mock("../components/Dialog.jsx", () => ({confirmDialog: async () => true}));

let api;
let setDoc, deleteDoc;

/** A promise with its resolve and reject exposed. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return {promise, resolve, reject};
}

const notebook = (content = "echo(1)") => ({id: "nb", title: "Test", content, runtime: "javascript@0.1.0"});

// Lets the async steps between awaits run.
const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  setDoc = store.setDoc = vi.fn(async () => {});
  deleteDoc = store.deleteDoc = vi.fn(async () => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  api = await import("../app/api.js");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("drops a queued save when the notebook is deleted", async () => {
  api.saveNotebookDebounced(notebook());
  expect(await api.deleteNotebook("nb")).toBe(true);
  api.flushPendingSave(); // As when the editor unmounts.
  await vi.advanceTimersByTimeAsync(10_000);
  expect(setDoc).not.toHaveBeenCalled();
  expect(api.hasUnsavedChanges()).toBe(false);
});

it("waits for a save on its way before deleting", async () => {
  const write = deferred();
  setDoc.mockReturnValueOnce(write.promise);
  api.saveNotebookDebounced(notebook());
  await vi.advanceTimersByTimeAsync(800);
  expect(setDoc).toHaveBeenCalledTimes(1);

  const done = api.deleteNotebook("nb");
  await settle();
  expect(deleteDoc).not.toHaveBeenCalled();
  write.resolve();
  expect(await done).toBe(true);
  expect(deleteDoc).toHaveBeenCalledTimes(1);
});

it("doesn't retry a failed save of a deleted notebook", async () => {
  const write = deferred();
  setDoc.mockReturnValueOnce(write.promise);
  api.saveNotebookDebounced(notebook());
  await vi.advanceTimersByTimeAsync(800);

  const done = api.deleteNotebook("nb");
  write.reject(new Error("offline"));
  expect(await done).toBe(true);
  await vi.advanceTimersByTimeAsync(10_000);
  api.flushPendingSave();
  expect(setDoc).toHaveBeenCalledTimes(1);
});

it("ignores edits made during or after the delete", async () => {
  const removal = deferred();
  deleteDoc.mockReturnValueOnce(removal.promise);
  const done = api.deleteNotebook("nb");
  await settle();
  api.saveNotebookDebounced(notebook("echo(2)"));
  await api.saveNotebook(notebook("echo(3)"));
  removal.resolve();
  await done;
  api.saveNotebookDebounced(notebook("echo(4)"));
  api.flushPendingSave();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(setDoc).not.toHaveBeenCalled();
});

it("saves the edits held during a delete that fails", async () => {
  const removal = deferred();
  deleteDoc.mockReturnValueOnce(removal.promise);
  api.saveNotebookDebounced(notebook("echo(1)"));
  const done = api.deleteNotebook("nb");
  await settle();
  api.saveNotebookDebounced(notebook("echo(2)"));
  await vi.advanceTimersByTimeAsync(800);
  expect(setDoc).not.toHaveBeenCalled();

  removal.reject(new Error("permission denied"));
  await expect(done).rejects.toThrow("permission denied");
  expect(api.hasUnsavedChanges()).toBe(true);
  await vi.advanceTimersByTimeAsync(800);
  expect(setDoc).toHaveBeenCalledTimes(1);
  expect(setDoc.mock.calls[0][1].content).toBe("echo(2)");
});
