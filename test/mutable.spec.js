import {it, expect, describe, afterEach, beforeEach, vi} from "vitest";
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

// Tests here break notebooks on purpose, and the runtime logs every error it
// shows. Keep those logs out of the test output.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

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
    expect(notebook.doc()).toContain("`c` is changed by a block that also depends on it");
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

  it("resets when a block that calls a writing function is edited", async () => {
    run(`let c = 0;\n\nfunction inc() {\n  c++;\n}\n\n{\n  inc();\n}\n\ninc();\n\necho(c);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 2\necho(c);`);
    notebook.edit("}\n\ninc();", "}\n\ninc(), inc();");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 3\necho(c);`);
  });

  it("orders blocks that call writing functions", async () => {
    run(
      `let c = 0;\n\nfunction inc() {\n  c++;\n}\n\nfunction reset() {\n  c = 0;\n}\n\ninc();\n\nreset();\n\n{\n  inc();\n}\n\necho(c);`,
    );
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1\necho(c);`);
  });

  it("doesn't create a cycle when a writer uses a later writer", async () => {
    run(
      `let count = 0;\n\nrecho.button("+", () => {\n  count++;\n  if (count > 2) reset();\n});\n\nfunction reset() {\n  count = 0;\n}\n\necho(count);`,
    );
    await wait();
    expect(notebook.doc()).not.toContain("circular definition");
    notebook.runtime.buttonRegistry.executeCallback("+");
    notebook.runtime.buttonRegistry.executeCallback("+");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 2\necho(count);`);
    notebook.runtime.buttonRegistry.executeCallback("+");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 0\necho(count);`);
  });

  it("doesn't spread a writer's error to later writers", async () => {
    run(`let a = 1;\n\na = undefinedThing;\n\na += 5;\n\necho(a);`);
    await wait();
    expect(notebook.doc()).toContain(`undefinedThing is not defined`);
    expect(notebook.doc()).toContain(`;\n\na += 5;\n\n//➜ 6\necho(a);`);
  });

  it("shows readers only the value after all writers ran", async () => {
    globalThis.__rechoSeen = [];
    run(`let url = "a";\n\nurl = "b";\n\nglobalThis.__rechoSeen.push(url);`);
    await wait();
    expect(globalThis.__rechoSeen).toEqual(["b"]);
    notebook.edit(`url = "b";`, `url = "c";`);
    await wait();
    expect(globalThis.__rechoSeen).toEqual(["b", "c"]);
    delete globalThis.__rechoSeen;
  });

  it("doesn't re-run later writers when a writer's own input changes", async () => {
    run(`let a = 0;\n\nconst t = recho.interval(20);\n\na += t >= 0 ? 1 : 0;\n\na *= 10;\n\necho(a);`);
    await wait(200);
    const value = Number(notebook.doc().match(/\/\/➜ (\d+)\necho\(a\);/)[1]);
    // 10 after the first run, then +1 per tick; never multiplied again.
    expect(value).toBeGreaterThan(10);
    expect(value).toBeLessThan(100);
  });

  it("rejects a writer that depends on its variable through another block", async () => {
    globalThis.__rechoRuns = 0;
    run(`let a = 0;\n\nconst b = a;\n\n{\n  globalThis.__rechoRuns++;\n  a = b + 1;\n}\n\necho(a);`);
    await wait(300);
    expect(notebook.doc()).toContain("`a` is changed by a block that also depends on it");
    expect(globalThis.__rechoRuns).toBeLessThan(3);
    delete globalThis.__rechoRuns;
  });

  it("rejects calling a writing function from a block that depends on the variable", async () => {
    run(`let a = 0;\n\nfunction inc() {\n  a++;\n}\n\nconst b = a;\n\necho(b, inc());`);
    await wait();
    expect(notebook.doc()).toContain("`a` is changed by a block that also depends on it");
  });

  it("isn't affected by locals named like internal variables", async () => {
    run(`let a = 0;\n\n{\n  const mutator$a = {value: 10};\n  const $recho$m$a = {value: 10};\n  a++;\n}\n\necho(a);`);
    await wait();
    expect(notebook.doc()).toContain(`//➜ 1\necho(a);`);
  });

  it("isn't affected by top-level names like internal variables", async () => {
    run(
      `let a = 0;\n\na = 1;\n\na = a * 10;\n\nconst chain$a$0 = 5;\n\nconst $recho$c0$a = 6;\n\necho(a, chain$a$0, $recho$c0$a);`,
    );
    await wait();
    expect(notebook.doc()).toContain(`//➜ 10 5 6\necho(a, chain$a$0, $recho$c0$a);`);
  });

  it("waits for earlier writers even when a later one fails at once", async () => {
    run(`let a = 1;\n\nawait new Promise((r) => setTimeout(r, 50)), (a = 2);\n\na = missing;\n\na *= 10;\n\necho(a);`);
    await wait(300);
    expect(notebook.doc()).toContain(`//➜ 20\necho(a);`);
  });

  it("doesn't replay an earlier failure while the writer runs again", async () => {
    run(
      `const s = recho.interval(300);\n\nlet a = s >= 0 ? 1 : 0;\n\nconst flaky = s === 0 ? Promise.reject(new Error("flaky")) : s;\n\nawait new Promise((r) => setTimeout(r, 40)), (a = 2 + flaky * 0);\n\na *= 10;\n\necho(a);`,
    );
    // After the first retry (tick 1 + 40ms), before tick 2.
    await wait(420);
    expect(notebook.doc()).toContain(`//➜ 20\necho(a);`);
  });
});
