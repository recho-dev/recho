import {it, expect, describe, afterEach, beforeEach} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime, mapPos} from "../runtime/index.js";
import {JAVASCRIPT_OUTPUT} from "../runtime/output.js";

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

// Mirrors the editor: apply the runtime's changes and feed the new code back.
function start(code, options) {
  let state = EditorState.create({doc: code});
  const runtime = createRuntime(code, options);
  runtime.onChanges((specs) => {
    state = state.update(specs).state;
    runtime.setCode(state.doc.toString());
  });
  runtime.run();
  return {
    runtime,
    doc: () => state.doc.toString(),
    // Edits the code as the user does, which stops running.
    edit(search, replacement) {
      const from = state.doc.toString().indexOf(search);
      state = state.update({changes: {from, to: from + search.length, insert: replacement}}).state;
      runtime.setCode(state.doc.toString());
      runtime.setIsRunning(false);
    },
    runCells(...searches) {
      runtime.runCells(searches.map((search) => state.doc.toString().indexOf(search)));
    },
  };
}

const code = `const a = ++globalThis.__a;\n\necho(a);\n\necho(++globalThis.__c);`;

describe("runCells", () => {
  let notebook;

  // Counters that cells increment, to tell their runs apart.
  const counters = ["__a", "__b", "__c", "__t"];

  beforeEach(() => {
    for (const name of counters) globalThis[name] = 0;
  });

  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    for (const name of counters) delete globalThis[name];
    await wait(0);
  });

  it("runs the cell and the cells that read it again", async () => {
    notebook = start(code);
    await wait();
    expect(notebook.doc()).toBe(`const a = ++globalThis.__a;\n\n//➜ 1\necho(a);\n\n//➜ 1\necho(++globalThis.__c);`);
    notebook.runCells("const a");
    await wait();
    expect(notebook.doc()).toBe(`const a = ++globalThis.__a;\n\n//➜ 2\necho(a);\n\n//➜ 1\necho(++globalThis.__c);`);
  });

  it("runs a cell with output on its own", async () => {
    notebook = start(code);
    await wait();
    notebook.runCells("echo(++globalThis.__c)");
    await wait();
    expect(notebook.doc()).toBe(`const a = ++globalThis.__a;\n\n//➜ 1\necho(a);\n\n//➜ 2\necho(++globalThis.__c);`);
  });

  it("applies edits to other cells", async () => {
    notebook = start(code);
    await wait();
    notebook.edit("echo(a);", "echo(a * 10);");
    notebook.runCells("echo(++globalThis.__c)");
    await wait();
    expect(notebook.doc()).toBe(
      `const a = ++globalThis.__a;\n\n//➜ 10\necho(a * 10);\n\n//➜ 2\necho(++globalThis.__c);`,
    );
  });

  it("applies the deletion of a cell", async () => {
    notebook = start(code);
    await wait();
    notebook.edit("const a = ++globalThis.__a;\n\n", "");
    notebook.runCells("echo(++globalThis.__c)");
    await wait();
    expect(notebook.doc()).toContain("a is not defined");
    expect(notebook.doc()).toContain(`//➜ 2\necho(++globalThis.__c);`);
    expect(globalThis.__a).toBe(1);
  });

  it("runs several cells on one line", async () => {
    notebook = start(`echo(++globalThis.__a); echo(++globalThis.__c);`);
    await wait();
    expect(notebook.doc()).toBe(`//➜ 1\necho(++globalThis.__a); //➜ 1\necho(++globalThis.__c);`);
    notebook.runCells("echo(++globalThis.__a)", "echo(++globalThis.__c)");
    await wait();
    // Output written inside a line isn't replaced (on main too), so check
    // that both ran rather than the document.
    expect([globalThis.__a, globalThis.__c]).toEqual([2, 2]);
  });

  it("ignores echoes from the cell's previous run", async () => {
    // A stale echo throws, which the timer catches.
    const cell = `{\n  const id = ++globalThis.__t;\n  setTimeout(() => {\n    try {\n      echo(id);\n    } catch {}\n  }, 100);\n}`;
    notebook = start(cell);
    await wait(50);
    // Runs again before the first run's timer fires.
    notebook.runCells("{");
    // After the first run's timer, before this run's.
    await wait(80);
    expect(notebook.doc()).toBe(cell);
    await wait(150);
    expect(notebook.doc()).toBe(`//➜ 2\n${cell}`);
  });

  it("keeps the cell to run while output moves it during an async split", async () => {
    notebook = start(
      `t | | setTimeout(() => echo("late"), 150); return {t: 1}\nb | | return {b: ++globalThis.__b}\n | b | echo(b)`,
      {
        language: delayed(100),
      },
    );
    await wait(180);
    expect(notebook.doc()).toContain(`//➜ 1\n | b | echo(b)`);
    // An edit, so that running splits the code again; the first cell's timer
    // writes output above the clicked cell during that split.
    notebook.edit("echo(b)", "echo(b * 10)");
    notebook.runCells("b | |");
    await wait(450);
    expect(notebook.doc()).toContain(`//➜ "late"`);
    expect(notebook.doc()).toContain(`//➜ 20\n | b | echo(b * 10)`);
  });
});

describe("mapPos", () => {
  it("moves a position with changes before it, including insertions at it", () => {
    expect(mapPos([{from: 0, insert: "ab"}], 5)).toBe(7);
    expect(mapPos([{from: 5, insert: "ab"}], 5)).toBe(7);
    expect(mapPos([{from: 1, to: 3, insert: ""}], 5)).toBe(3);
    expect(mapPos([{from: 6, insert: "ab"}], 5)).toBe(5);
  });

  it("drops a position that a change replaces", () => {
    expect(mapPos([{from: 3, to: 7, insert: "x"}], 5)).toBe(null);
  });
});

// A fake compiled language, whose `nodes` take `ms` to return: each line is
// a node, written as `outputs | inputs | body`, where the body is that of an
// async function of the inputs returning its outputs. Output lines are skipped.
function delayed(ms) {
  const nodes = (code) => {
    const nodes = [];
    let start = 0;
    for (const line of code.split("\n")) {
      const end = start + line.length;
      if (line.trim() && !line.startsWith("//")) {
        const [outs, ins, body] = line.split("|");
        const outputs = outs.split(" ").filter(Boolean);
        nodes.push({
          key: outs.trim() || `line@${start}`,
          start,
          end,
          inputs: ins.split(" ").filter(Boolean),
          outputs,
          body,
        });
      }
      start = end + 1;
    }
    return nodes;
  };
  return {
    id: "delayed",
    output: JAVASCRIPT_OUTPUT,
    nodes: (code) => new Promise((resolve) => setTimeout(() => resolve(nodes(code)), ms)),
    errorOffset: () => 0,
  };
}
