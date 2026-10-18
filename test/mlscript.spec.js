import fs from "fs";
import {it, expect, describe, afterEach, beforeAll} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {RUNTIMES, highlightLanguage, languageOf} from "../app/shared.js";
import {getAllJSExamples, removeMeta} from "../app/utils.js";
import {createNotebook} from "../app/api.js";

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

let mlscript;

beforeAll(async () => {
  mlscript = await loadLanguage("mlscript@0.1.0");
}, 30000);

function start(code) {
  let state = EditorState.create({doc: code});
  const runtime = createRuntime(code, {language: mlscript});
  runtime.onChanges((specs) => {
    state = state.update(specs).state;
    runtime.setCode(state.doc.toString());
  });
  runtime.run();
  return {
    runtime,
    doc: () => state.doc.toString(),
    edit(search, replacement) {
      const from = state.doc.toString().indexOf(search);
      state = state.update({changes: {from, to: from + search.length, insert: replacement}}).state;
      runtime.setCode(state.doc.toString());
      runtime.run();
    },
  };
}

describe("mlscript", () => {
  let notebook;
  const run = (code) => (notebook = start(code));
  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    await wait(0);
  });

  it("loads only when asked for", async () => {
    expect((await loadLanguage("javascript@0.1.0")).id).toBe("javascript");
    expect(mlscript.id).toBe("mlscript");
    expect(await loadLanguage("mlscript@0.1.0")).toBe(mlscript);
    expect(languageOf(RUNTIMES.mlscript)).toBe("mlscript");
    expect(highlightLanguage(RUNTIMES.mlscript)).toBe("text");
  });

  it("writes output above the blocks: classes, a companion module, mutual recursion", async () => {
    run(SAMPLE);
    await wait();
    expect(notebook.doc()).toBe(SAMPLE_OUTPUT);
  });

  it("is idempotent", async () => {
    run(SAMPLE_OUTPUT);
    await wait();
    expect(notebook.doc()).toBe(SAMPLE_OUTPUT);
  });

  it("keeps node keys and offsets when output lines are inserted", () => {
    const code = `let a = 1\n\necho(a)\n`;
    const before = mlscript.nodes(code);
    const after = mlscript.nodes(`//➜ stale\nlet a = 1\n\n//➜ 1\n//➜ 2\necho(a)\n`);
    expect(after.map((n) => n.key)).toEqual(before.map((n) => n.key));
    expect(after.map((n) => n.body)).toEqual(before.map((n) => n.body));
    expect(before.map((n) => [n.start, n.end])).toEqual([
      [0, 9],
      [11, 18],
    ]);
    // Each node starts at its line, right after its output.
    expect(after.map((n) => [n.start, n.end])).toEqual([
      [10, 19],
      [33, 40],
    ]);
  });

  it("re-runs only the edited node and its dependents", async () => {
    run(`let t = globalThis.Math.random()\n\necho(t)\n\nlet a = 1\n\nlet b = a + 1\n\necho(b)\n`);
    await wait();
    const random = notebook.doc().match(/\/\/➜ (0\.\d+)/)[1];
    expect(notebook.doc()).toContain(`//➜ 2\necho(b)`);
    notebook.edit("let a = 1", "let a = 5");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 6\necho(b)`);
    expect(notebook.doc()).toContain(`//➜ ${random}\necho(t)`);
  });

  it("shows an echo inside a function above the block that calls it", async () => {
    run(`fun f(x) =\n  echo(x)\n  x\n\nlet q = f(2)\n\nlet r = f(3)\n`);
    await wait();
    expect(notebook.doc()).toBe(`fun f(x) =\n  echo(x)\n  x\n\n//➜ 2\nlet q = f(2)\n\n//➜ 3\nlet r = f(3)\n`);
  });

  it("shows a compile error at its block and keeps running the others", async () => {
    run(`let a = 1\n\nlet bad = nope + 1\n\necho(a + 1)\n`);
    await wait();
    expect(notebook.doc()).toBe(
      `let a = 1\n\n//✗ [SyntaxError: Name not found in wildcard opens: nope]\nlet bad = nope + 1\n\n//➜ 2\necho(a + 1)\n`,
    );
    notebook.edit("nope + 1", "a + 10");
    await wait();
    expect(notebook.doc()).toBe(`let a = 1\n\nlet bad = a + 10\n\n//➜ 2\necho(a + 1)\n`);
  });

  it("shows a parse error at its block and keeps running the others", async () => {
    run(`let a = (1 +\n\nlet b = 2\n\necho(b)\n`);
    await wait();
    const doc = notebook.doc();
    expect(doc).toMatch(/^\/\/✗ \[SyntaxError: Unmatched opening parenthesis/);
    expect(doc).toContain(`//➜ 2\necho(b)`);
  });

  it("shows values the way MLscript prints them", async () => {
    run(`data class Pair(a, b)\n\necho(Pair(1, "x"), [1, 2], "s", true)\n\necho("one\\ntwo")\n`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ Pair(1, "x") [1, 2] s true\necho(`);
    expect(notebook.doc()).toContain(`//➜ one\n//➜ two\necho("one`);
  });

  it("runs the example notebook to the output it was saved with", async () => {
    const example = fs.readFileSync("app/examples/mlscript-shapes.recho.mls", "utf8");
    run(example);
    await wait();
    expect(notebook.doc()).toBe(example);
  });

  it("starts a new notebook with MLscript code that runs without errors", async () => {
    const created = createNotebook(RUNTIMES.mlscript);
    expect(created.title).toMatch(/\.mls$/);
    expect(created.runtime).toBe(RUNTIMES.mlscript);
    run(created.content);
    await wait();
    expect(notebook.doc()).toContain("//➜ Point(3, 4) 7 Point(0, 0)\necho(");
    expect(notebook.doc()).not.toContain("//✗");
  });

  it("lists .recho.mls examples as MLscript notebooks", () => {
    const example = getAllJSExamples().find((e) => e.slug === "mlscript-shapes");
    expect(example).toMatchObject({title: "MLscript Shapes", runtime: RUNTIMES.mlscript});
    expect(removeMeta(example)).toMatch(/^\/\/ MLscript/);
  });

  it("supports shadowing and imports from the standard library", async () => {
    run(`let x = 1\n\nlet x = x + 10\n\necho(x)\n\nimport "std/Option.mls"\n\necho(Option.Some(x))\n`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 11\necho(x)`);
    expect(notebook.doc()).toContain(`//➜ Some(11)\necho(Option.Some(x))`);
  });
});

const SAMPLE = `class Point(val x: Int, val y: Int) with
  fun norm1 = x + y
module Point with
  fun origin = Point(0, 0)

let p = Point(1, 2)
echo(p, p.norm1, Point.origin)

fun even(n) = if n == 0 then true else odd(n - 1)
fun odd(n) = if n == 0 then false else even(n - 1)

echo(even(10), odd(7))
`;

const SAMPLE_OUTPUT = `class Point(val x: Int, val y: Int) with
  fun norm1 = x + y
module Point with
  fun origin = Point(0, 0)

let p = Point(1, 2)
//➜ Point(1, 2) 3 Point(0, 0)
echo(p, p.norm1, Point.origin)

fun even(n) = if n == 0 then true else odd(n - 1)
fun odd(n) = if n == 0 then false else even(n - 1)

//➜ true true
echo(even(10), odd(7))
`;
