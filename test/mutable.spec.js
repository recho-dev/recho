import {it, expect, describe, afterEach} from "vitest";
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
    edit(search, replacement) {
      const from = state.doc.toString().indexOf(search);
      state = state.update({changes: {from, to: from + search.length, insert: replacement}}).state;
      runtime.setCode(state.doc.toString());
      runtime.run();
    },
  };
}

describe("top-level let", () => {
  let notebook;
  const run = (code) => (notebook = start(code));

  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    await wait(0);
  });

  it("accumulates in a loop", async () => {
    run(`let s = "";\n\nfor (let i = 0; i < 5; i++) s += i;\n\necho(s);`);
    await wait();
    expect(notebook.doc()).toBe(`let s = "";\n\nfor (let i = 0; i < 5; i++) s += i;\n\n//➜ "01234"\necho(s);`);
  });

  it("updates readers after an async assignment", async () => {
    run(`let a = 0;\n\nsetTimeout(() => {\n  a += 1;\n}, 50);\n\necho(a);`);
    await wait(30);
    expect(notebook.doc()).toContain(`//➜ 0\necho(a);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1\necho(a);`);
  });

  it("supports functions that assign", async () => {
    run(`let c = 0;\n\nfunction inc() {\n  c++;\n}\n\ninc();\n\ninc();\n\necho(c);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 2\necho(c);`);
  });

  it("supports button callbacks that assign", async () => {
    run(`let n = 0;\n\nrecho.button("Add", () => {\n  n += 1;\n});\n\necho(n);`);
    await wait();
    notebook.runtime.buttonRegistry.executeCallback("Add");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1\necho(n);`);
  });

  it("runs writers in source order", async () => {
    run(`let a = 1;\n\na = 2;\n\na = a * 10;\n\necho(a);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 20\necho(a);`);
  });

  it("resets the group when a writer is edited", async () => {
    run(`let a = 1;\n\na = 2;\n\na = a * 10;\n\necho(a);`);
    await wait();
    notebook.edit("a = a * 10;", "a = a * 100;");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 200\necho(a);`);
  });

  it("accumulates when a writer's own input changes", async () => {
    run(`let trail = "";\n\nconst t = recho.interval(20);\n\ntrail += t;\n\necho(trail);`);
    const trail = () => notebook.doc().match(/\/\/➜ "(\d*)"\necho\(trail\);/)?.[1] ?? "";
    for (let i = 0; i < 100 && trail().length < 4; i++) await wait(20);
    // Every tick is appended to the previous value: no reset, no gaps.
    expect(trail().length).toBeGreaterThanOrEqual(4);
    expect("0123456789".startsWith(trail().slice(0, 10))).toBe(true);
  });

  it("rejects a block that reads and changes the same variable", async () => {
    run(`let c = 0;\n\nfunction inc() {\n  c++;\n}\n\necho(c, inc());`);
    await wait();
    expect(notebook.doc()).toContain("`c` is read and changed in the same block. Split it into two blocks.");
  });

  it("supports destructuring assignment", async () => {
    run(`let [a, b] = [1, 2];\n\n[a, b] = [b, a];\n\necho(a, b);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 2 1\necho(a, b);`);
  });

  it("expands shorthand properties in writers", async () => {
    run(`let a = 1;\n\n{\n  a += 1;\n  echo({a});\n}`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ { a: 2 }`);
  });

  it("leaves shadowed variables alone", async () => {
    run(`let a = 1;\n\na = 5;\n\nfunction f() {\n  let a = 0;\n  a++;\n  return a;\n}\n\necho(f(), a);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1 5\necho(f(), a);`);
  });

  it("still rejects assigning to a const from another block", async () => {
    run(`const c = 1;\n\nc = 2;`);
    await wait();
    expect(notebook.doc()).toContain("Assignment to external variable 'c'");
  });

  it("supports let without an initializer", async () => {
    run(`let a;\n\necho(a);\n\nsetTimeout(() => {\n  a = 3;\n}, 50);`);
    await wait(30);
    expect(notebook.doc()).toContain(`//➜ undefined\necho(a);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 3\necho(a);`);
  });

  it("re-runs readers when the same object is assigned again", async () => {
    run(`let list = [];\n\nrecho.button("Push", () => {\n  list.push(1);\n  list = list;\n});\n\necho(list.length);`);
    await wait();
    notebook.runtime.buttonRegistry.executeCallback("Push");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1\necho(list.length);`);
  });

  it("turns back into a plain let when the last writer is removed", async () => {
    run(`let a = 1;\n\na = 2;\n\necho(a);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 2\necho(a);`);
    notebook.edit("a = 2;", "");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1\necho(a);`);
  });
});
