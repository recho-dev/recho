import {it, expect, describe, afterEach, beforeEach} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

// Mirrors the editor: apply the runtime's changes and feed the new code back.
function start(code) {
  let state = EditorState.create({doc: code});
  const runtime = createRuntime(code);
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
    runCell(search) {
      runtime.runCell(state.doc.toString().indexOf(search));
    },
  };
}

const code = `const a = ++globalThis.__a;\n\necho(a);\n\necho(++globalThis.__c);`;

describe("runCell", () => {
  let notebook;

  beforeEach(() => {
    globalThis.__a = 0;
    globalThis.__c = 0;
  });

  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    delete globalThis.__a;
    delete globalThis.__c;
    await wait(0);
  });

  it("runs the cell and the cells that read it again", async () => {
    notebook = start(code);
    await wait();
    expect(notebook.doc()).toBe(`const a = ++globalThis.__a;\n\n//➜ 1\necho(a);\n\n//➜ 1\necho(++globalThis.__c);`);
    notebook.runCell("const a");
    await wait();
    expect(notebook.doc()).toBe(`const a = ++globalThis.__a;\n\n//➜ 2\necho(a);\n\n//➜ 1\necho(++globalThis.__c);`);
  });

  it("runs a cell with output on its own", async () => {
    notebook = start(code);
    await wait();
    notebook.runCell("echo(++globalThis.__c)");
    await wait();
    expect(notebook.doc()).toBe(`const a = ++globalThis.__a;\n\n//➜ 1\necho(a);\n\n//➜ 2\necho(++globalThis.__c);`);
  });

  it("applies edits to other cells", async () => {
    notebook = start(code);
    await wait();
    notebook.edit("echo(a);", "echo(a * 10);");
    notebook.runCell("echo(++globalThis.__c)");
    await wait();
    expect(notebook.doc()).toBe(
      `const a = ++globalThis.__a;\n\n//➜ 10\necho(a * 10);\n\n//➜ 2\necho(++globalThis.__c);`,
    );
  });

  it("applies the deletion of a cell", async () => {
    notebook = start(code);
    await wait();
    notebook.edit("const a = ++globalThis.__a;\n\n", "");
    notebook.runCell("echo(++globalThis.__c)");
    await wait();
    expect(notebook.doc()).toContain("a is not defined");
    expect(notebook.doc()).toContain(`//➜ 2\necho(++globalThis.__c);`);
    expect(globalThis.__a).toBe(1);
  });
});
