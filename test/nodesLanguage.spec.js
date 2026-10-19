import {it, expect, describe, afterEach} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {JAVASCRIPT_OUTPUT} from "../runtime/output.js";

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

// A fake compiled language: each line is a node, written as
// `outputs | inputs | body`, where a `~` marks a hidden output and the body is
// that of an async function of the inputs. Lines starting with `//` (output)
// and blank lines are skipped.
const fake = {
  id: "fake",
  output: JAVASCRIPT_OUTPUT,
  nodes(code) {
    const nodes = [];
    let start = 0;
    for (const line of code.split("\n")) {
      const end = start + line.length;
      if (line.trim() && !line.startsWith("//")) {
        const parts = line.split("|");
        if (parts.length !== 3) throw new SyntaxError("Expected `outputs | inputs | body`");
        const [outs, ins, body] = parts;
        const names = outs.split(" ").filter(Boolean);
        nodes.push({
          key: outs.trim() || `line@${start}`,
          start,
          end,
          inputs: ins.split(" ").filter(Boolean),
          outputs: names.filter((n) => !n.startsWith("~")),
          hiddenOutputs: names.filter((n) => n.startsWith("~")).map((n) => n.slice(1)),
          body,
        });
      }
      start = end + 1;
    }
    return nodes;
  },
  errorOffset: () => 0,
};

// `fake`, with `nodes` returning a promise after `delay(code)` ms (like a
// compiler in a worker).
const delayed = (delay) => ({
  ...fake,
  nodes: (code) =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(fake.nodes(code));
        } catch (error) {
          reject(error);
        }
      }, delay(code)),
    ),
});

// Mirrors the editor: apply the runtime's changes and feed the new code back.
function start(code, language = fake) {
  let state = EditorState.create({doc: code});
  const runtime = createRuntime(code, {language});
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

describe("a language with nodes", () => {
  let notebook;
  const run = (code, language) => (notebook = start(code, language));

  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    delete globalThis.__runs__;
    await wait(0);
  });

  it("inserts output above the node that echoes it", async () => {
    run(`a | | return {a: 1};\n| a | echo(a + 1);\n| | echo("hi"); return {};`);
    await wait();
    expect(notebook.doc()).toBe(
      `a | | return {a: 1};\n//➜ 2\n| a | echo(a + 1);\n//➜ "hi"\n| | echo("hi"); return {};`,
    );
  });

  it("re-runs a node when an upstream node changes, and keeps an unchanged node's state", async () => {
    globalThis.__runs__ = {b: 0, c: 0};
    run(
      `a | | return {a: 1};\nb | a | __runs__.b++; echo(a * 10); return {b: a};\nc | | __runs__.c++; echo("c"); return {c: 0};`,
    );
    await wait();
    expect(notebook.doc()).toContain(`//➜ 10\nb |`);
    expect(globalThis.__runs__).toEqual({b: 1, c: 1});

    notebook.edit("{a: 1}", "{a: 2}");
    await wait();
    expect(notebook.doc()).toContain(`//➜ 20\nb |`);
    expect(notebook.doc()).toContain(`//➜ "c"\nc |`);
    expect(globalThis.__runs__).toEqual({b: 2, c: 1});
  });

  it("lets other nodes read hidden outputs, without computing unread ones", async () => {
    const reads = [];
    globalThis.__runs__ = {
      exports: () => ({
        get t() {
          reads.push("t");
          return 3;
        },
        get u() {
          reads.push("u");
          return 4;
        },
      }),
    };
    run(`~t ~u | | return __runs__.exports();\n| t | echo(t * 2);`);
    await wait();
    expect(notebook.doc()).toBe(`~t ~u | | return __runs__.exports();\n//➜ 6\n| t | echo(t * 2);`);
    expect(reads).toEqual(["t"]);
  });

  it("shows an error thrown by `nodes` like a syntax error", async () => {
    run(`a | return {a: 1};`);
    await wait();
    expect(notebook.doc()).toBe(`//✗ [SyntaxError: Expected \`outputs | inputs | body\`]\na | return {a: 1};`);
  });

  it("accepts nodes as a promise, and shows its rejection like a syntax error", async () => {
    run(
      `a | | return {a: 1};\n| a | echo(a + 1);`,
      delayed(() => 10),
    );
    await wait();
    expect(notebook.doc()).toBe(`a | | return {a: 1};\n//➜ 2\n| a | echo(a + 1);`);

    notebook.edit("{a: 1};", "{a: 1};\nb | return {b: 1};");
    await wait();
    expect(notebook.doc()).toMatch(/^\/\/✗ \[SyntaxError: Expected/);
  });

  it("uses the nodes of the latest run, even when an earlier run's come later", async () => {
    globalThis.__runs__ = [];
    const node = (name) => `| | __runs__.push("${name}"); echo("${name}"); return {};`;
    // The first run's nodes come after the second's.
    run(
      node("old"),
      delayed((code) => (code.includes("old") ? 100 : 10)),
    );
    notebook.edit(node("old"), node("new"));
    await wait(300);
    expect(notebook.doc()).toBe(`//➜ "new"\n${node("new")}`);
    expect(globalThis.__runs__).toEqual(["new"]);
  });
});
