import {it, expect, describe, beforeAll, afterAll, afterEach, vi} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {RUNTIMES} from "../app/shared.js";
import {getAllJSDocs, removeJSMeta} from "../app/utils.js";
import {createNotebook} from "../app/api.js";
import {docsNavConfig} from "../app/docs/nav.config.js";

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

let mlscript, runtime;
const realSetTimeout = globalThis.setTimeout;

beforeAll(async () => {
  // The docs show the output of `recho.now()` at noon, and the first frame of
  // `recho.interval`: timers of a second or more never fire.
  vi.useFakeTimers({toFake: ["Date"]});
  vi.setSystemTime(new Date(2026, 9, 19, 12, 0, 0));
  globalThis.setTimeout = (callback, ms, ...args) => (ms >= 1000 ? 0 : realSetTimeout(callback, ms, ...args));
  mlscript = await loadLanguage(RUNTIMES.mlscript);
}, 30000);

afterAll(() => {
  globalThis.setTimeout = realSetTimeout;
  vi.useRealTimers();
});

afterEach(async () => {
  runtime?.destroy();
  runtime = null;
  await wait(0);
});

/** The code of a notebook after it ran once. */
async function run(code) {
  let state = EditorState.create({doc: code});
  runtime = createRuntime(code, {language: mlscript});
  runtime.onChanges((specs) => {
    state = state.update(specs).state;
    runtime.setCode(state.doc.toString());
  });
  runtime.run();
  // Until the output has stopped changing.
  let before;
  for (let i = 0; i < 100 && state.doc.toString() !== before; i++) {
    before = state.doc.toString();
    await wait(200);
  }
  return state.doc.toString();
}

const docs = getAllJSDocs();
const mlscriptDocs = docs.filter((doc) => doc.runtime === RUNTIMES.mlscript);
const tour = docsNavConfig.find((item) => item.title === "MLscript Tour");

describe("MLscript docs", () => {
  it("lists the tour pages as MLscript notebooks, and the other docs as JavaScript", () => {
    const slugs = tour.items.map((item) => item.slug);
    expect(mlscriptDocs.map((doc) => doc.slug).sort()).toEqual([...slugs].sort());
    for (const doc of docs) {
      expect(doc.title).toBeTruthy();
      if (!slugs.includes(doc.slug)) expect(doc.runtime).toBe(RUNTIMES.javascript);
    }
  });

  it.each(mlscriptDocs.map((doc) => [doc.slug, doc]))("runs %s to the output it was saved with", async (_, doc) => {
    const code = removeJSMeta(doc.content);
    const after = await run(code);
    expect(after).not.toContain("\n//✗");
    expect(after).toBe(code);
  });

  it("starts a new notebook that runs cleanly and links to the tour", async () => {
    const {content} = createNotebook(RUNTIMES.mlscript);
    const after = await run(content);
    expect(after).not.toContain("//✗");
    expect(after).toContain(`//➜ 25\necho(square(5))`);
    expect(after).toContain(`https://recho.dev/docs/${tour.items[0].slug}`);
  });
});
