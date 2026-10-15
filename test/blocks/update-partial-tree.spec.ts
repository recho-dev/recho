import {describe, expect, it, vi, beforeEach, afterEach} from "vitest";
import {EditorState, Transaction, type ChangeSpec} from "@codemirror/state";
import {javascript} from "@codemirror/lang-javascript";
import {ensureSyntaxTree, syntaxTree} from "@codemirror/language";
import {updateBlocks} from "../../editor/blocks/update.js";
import {detectBlocksWithinRange} from "../../lib/blocks/detect.js";
import {type BlockMetadata} from "../../editor/blocks/BlockMetadata.js";

// Lets a test pretend the parser could not finish within updateBlocks' budget.
const parser = vi.hoisted(() => ({budgetExhausted: false}));
vi.mock("@codemirror/language", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@codemirror/language")>();
  return {
    ...actual,
    ensureSyntaxTree: (...args: Parameters<typeof actual.ensureSyntaxTree>) =>
      parser.budgetExhausted ? null : actual.ensureSyntaxTree(...args),
  };
});

const DOC = [
  `const a = 2;`,
  `const b = a ** 2;`,
  ``,
  `echo(add(a, b));`,
  ``,
  `function add(a, b) {`,
  `  return a + b;`,
  `}`,
].join("\n");

/**
 * A document longer than CodeMirror's initial parse viewport (3000 characters)
 * gets only a partial syntax tree when its state is created, and every later
 * transaction parses just up to where the previous tree ended — so, without
 * help, `syntaxTree(state)` stops well short of the document.
 */
const LARGE_DOC = Array.from({length: 300}, (_, i) => `const v${i} = ${i};`).join("\n");

function createState(doc: string): EditorState {
  return EditorState.create({doc, extensions: [javascript()]});
}

/** Fully parse the state's document and detect all blocks in it. */
function detectAll(state: EditorState): BlockMetadata[] {
  const tree = ensureSyntaxTree(state, state.doc.length, 1e9);
  if (!tree) throw new Error("failed to parse the document");
  return detectBlocksWithinRange(tree, state.doc, 0, state.doc.length);
}

/** A user edit, deliberately without forcing a full re-parse afterwards. */
function edit(state: EditorState, changes: ChangeSpec): Transaction {
  return state.update({changes, annotations: Transaction.userEvent.of("input.type")});
}

const ranges = (blocks: BlockMetadata[]) =>
  blocks.map((b) => [b.source.from, b.source.to, b.output?.from ?? null, b.output?.to ?? null]);

describe("updateBlocks with an incomplete syntax tree", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, "group").mockImplementation(() => {});
    vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    parser.budgetExhausted = false;
    vi.restoreAllMocks();
  });

  it("finishes the parse itself when the state's tree stops short of the document", () => {
    const state = createState(LARGE_DOC);
    expect(syntaxTree(state).length).toBeLessThan(state.doc.length);
    // Ground truth comes from a separate state, so `state` keeps its partial parse.
    const blocks = detectAll(createState(LARGE_DOC));
    expect(blocks.length).toBe(300);

    const tr = edit(state, {from: 7, to: 7, insert: "x"});
    expect(syntaxTree(tr.state).length).toBeLessThan(tr.state.doc.length);

    const updated = updateBlocks(blocks, tr);
    expect(ranges(updated)).toEqual(ranges(detectAll(tr.state)));
    expect(updated.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps statements whole wherever the initial parse stopped", () => {
    // CodeMirror's initial parse stops when its time slice runs out, wherever
    // the parser happens to be: on a slow machine, that can be mid-statement.
    // Fake the clock so the slice runs out after `checks` clock reads, which
    // stops the parse at every reachable position in turn.
    const blocks = detectAll(createState(LARGE_DOC));
    const realNow = Date.now;
    const cuts = new Set<number>();
    for (let checks = 1; ; checks += 3) {
      let reads = 0;
      const start = realNow();
      vi.spyOn(Date, "now").mockImplementation(() => (++reads > checks ? start + 1e6 : start));
      const state = createState(LARGE_DOC);
      vi.mocked(Date.now).mockRestore();
      const cut = syntaxTree(state).length;
      if (cut >= 3000) break;
      if (cuts.has(cut)) continue;
      cuts.add(cut);

      const tr = edit(state, {from: 7, to: 7, insert: "x"});
      const updated = updateBlocks(blocks, tr);

      // A fresh parse of the edited document never saw a half-parsed statement.
      const fresh = ranges(detectAll(createState(tr.state.doc.toString())));
      expect(ranges(detectAll(tr.state)), `cut at ${cut}`).toEqual(fresh);
      expect(ranges(updated), `cut at ${cut}`).toEqual(fresh);
      expect(updated.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
    }
    expect(cuts.size).toBeGreaterThan(100);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps mapped old blocks when the parse cannot finish, then repairs them once it does", () => {
    const state = createState(LARGE_DOC);
    const blocks = detectAll(createState(LARGE_DOC));

    // An unterminated template literal in the first statement swallows the
    // rest of the document, but the parser "cannot finish" within the budget...
    const tr = edit(state, {from: 7, to: 7, insert: "`"});
    parser.budgetExhausted = true;
    const stale = updateBlocks(blocks, tr);
    parser.budgetExhausted = false;

    // ...so the old structure survives, mapped into the new coordinates.
    expect(stale.length).toBe(300);
    expect(stale.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
    expect(stale[0]!.source).toEqual({from: 0, to: blocks[0]!.source.to + 1});
    expect(stale[1]!.source).toEqual({from: blocks[1]!.source.from + 1, to: blocks[1]!.source.to + 1});

    // The background parser finishes later and dispatches a transaction that
    // carries the complete tree but no document changes.
    ensureSyntaxTree(tr.state, tr.state.doc.length, 1e9);
    const done = tr.state.update({});
    expect(done.docChanged).toBe(false);
    expect(syntaxTree(done.state)).not.toBe(syntaxTree(done.startState));
    expect(syntaxTree(done.state).length).toBe(done.state.doc.length);

    const repaired = updateBlocks(stale, done);
    expect(ranges(repaired)).toEqual(ranges(detectAll(done.state)));
    // The swallow collapsed the structure down to the last statement's end...
    expect(repaired.length).toBeLessThan(stale.length);
    expect(repaired[repaired.length - 1]!.source.to).toBe(done.state.doc.length);
    // ...and every surviving block inherits its identity from one it replaced.
    const oldIds = new Set(blocks.map((b) => b.id));
    for (const block of repaired) expect(oldIds.has(block.id)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("leaves blocks untouched by transactions that change neither the document nor the tree", () => {
    const state = createState(DOC);
    const blocks = detectAll(state);
    expect(blocks.length).toBe(4);

    const tr = state.update({selection: {anchor: 3}});
    expect(tr.docChanged).toBe(false);
    expect(updateBlocks(blocks, tr)).toBe(blocks);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
