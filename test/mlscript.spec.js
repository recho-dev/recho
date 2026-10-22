import fs from "fs";
import {it, expect, describe, afterEach, beforeAll, beforeEach, vi} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {RUNTIMES, fileNameOf, highlightLanguage, languageOf} from "../app/shared.js";
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

// Tests here break notebooks on purpose, and the runtime logs every error it
// shows. Keep those logs out of the test output.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

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
    expect(highlightLanguage(RUNTIMES.mlscript)).toBe("mlscript");
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

  it("keeps node keys and offsets when output lines are inserted", async () => {
    const code = `let a = 1\n\necho(a)\n`;
    const before = await mlscript.nodes(code);
    const after = await mlscript.nodes(`//➜ stale\nlet a = 1\n\n//➜ 1\n//➜ 2\necho(a)\n`);
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
      `let a = 1\n\n//✗ [CompileError: Unknown name \`nope\`. (4:10)]\nlet bad = nope + 1\n\n//➜ 2\necho(a + 1)\n`,
    );
    notebook.edit("nope + 1", "a + 10");
    await wait();
    expect(notebook.doc()).toBe(`let a = 1\n\nlet bad = a + 10\n\n//➜ 2\necho(a + 1)\n`);
  });

  it("shows a parse error at its block and keeps running the others", async () => {
    run(`let a = (1 +\n\nlet b = 2\n\necho(b)\n`);
    await wait();
    const doc = notebook.doc();
    expect(doc).toMatch(/^\/\/✗ \[ParseError: This `\(` is never closed\. \(2:8\)\]\n/);
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
    expect(fileNameOf(created.title, created.runtime)).toBe("untitled.mls");
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

  it("matches on classes from the standard library", async () => {
    run(
      `import "std/Option.mls"\n\nopen Option\n\n` +
        `fun orZero(o) = if o is\n  Some(x) then x\n  None then 0\n\necho(orZero(Some(3)), orZero(None))\n`,
    );
    await wait();
    expect(notebook.doc()).toContain(`//➜ 3 0\necho(orZero(Some(3)), orZero(None))`);
    expect(notebook.doc()).not.toContain("//✗");
  });

  describe("recho", () => {
    // The value shown above `before` (a regular expression), once it
    // differs from `previous`.
    const shownAbove = (before) => notebook.doc().match(new RegExp(`//➜ (.*)\\n${before}`))?.[1];
    async function nextShown(before, previous) {
      for (let i = 0; i < 100; i++) {
        const shown = shownAbove(before);
        if (shown !== undefined && shown !== previous) return shown;
        await wait(10);
      }
      return shownAbove(before);
    }

    it("is an input of the nodes that use it, and only of those", async () => {
      const nodes = await mlscript.nodes(`val t = recho.interval(10)\n\necho(t)\n`);
      expect(nodes.map((n) => n.inputs)).toEqual([
        ["echo", "recho", "__mlscript__"],
        ["echo", "t", "__mlscript__"],
      ]);
    });

    it("ticks with recho.interval, re-running the nodes that read it", async () => {
      run(`val t = recho.interval(20)\n\necho(t)\n\necho(t * 10)\n`);
      expect(await nextShown("echo\\(t\\)")).toBe("0");
      expect(await nextShown("echo\\(t\\)", "0")).toBe("1");
      expect(await nextShown("echo\\(t\\)", "1")).toBe("2");
      expect(await nextShown("echo\\(t \\* 10\\)", "0")).not.toBe("0");
      expect(notebook.doc()).not.toContain("//✗");
    });

    it("gives the current time with recho.now", async () => {
      run(`val now = recho.now()\n\necho(now > 0)\n`);
      expect(await nextShown("echo\\(now > 0\\)")).toBe("true");
    });

    it("keeps state with recho.state, set from another node", async () => {
      run(
        `val st = recho.state(0)\nval count = st.0\nval setCount = st.1\n\necho(count)\n\n` +
          `val t = recho.interval(10)\n\nif t < 3 do setCount(c => c + 10)\n`,
      );
      let shown = "0";
      while (shown !== "30") {
        const next = await nextShown("echo\\(count\\)", shown);
        expect(next).not.toBe(shown);
        shown = next;
      }
      await wait(100);
      expect(shownAbove("echo\\(count\\)")).toBe("30");
    });

    it("formats with recho.inspect, and controls give their current value", async () => {
      run(
        `echo(recho.inspect("a"))\n\necho(recho.number(12, {min: 0, max: 10}))\n\n` +
          `echo(recho.toggle(true))\n\necho(recho.radio(1, ["a", "b"]))\n`,
      );
      await wait();
      expect(notebook.doc()).toBe(
        `//➜ "a"\necho(recho.inspect("a"))\n\n//➜ 10\necho(recho.number(12, {min: 0, max: 10}))\n\n` +
          `//➜ true\necho(recho.toggle(true))\n\n//➜ "b"\necho(recho.radio(1, ["a", "b"]))\n`,
      );
    });

    it("lets a notebook define its own recho", async () => {
      run(`val recho = 1\n\necho(recho + 1)\n`);
      await wait();
      expect(notebook.doc()).toContain(`//➜ 2\necho(recho + 1)`);
    });

    it("runs the clock example", async () => {
      run(fs.readFileSync("app/examples/mlscript-clock.recho.mls", "utf8"));
      expect(await nextShown('echo\\("Seconds since opening:", tick\\)')).toBe("Seconds since opening: 0");
      expect(await nextShown('echo\\("Time:", clock\\(now\\)\\)', "Time: 12:00:00")).toMatch(/^Time: \d\d:\d\d:\d\d$/);
      const frame = await nextShown("echo\\(spinner", "| [                   ]");
      expect(frame).toMatch(/^[|/\\-] \[#+ *\]$/);
      expect(notebook.doc()).not.toContain("//✗");
    });
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
