import {it, expect, describe, afterEach} from "vitest";
import {EditorState} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {javascript} from "@codemirror/lang-javascript";
import {ensureSyntaxTree, forceParsing} from "@codemirror/language";
import {clearOutputChanges, outputLines} from "../editor/blocks/output.ts";
import {wenyanSupport} from "../editor/languages/wenyan.js";

function clear(state) {
  return state.update({changes: clearOutputChanges(state)}).state.doc.toString();
}

function js(doc) {
  const state = EditorState.create({doc, extensions: [javascript(), outputLines]});
  ensureSyntaxTree(state, state.doc.length, 5000);
  // A transaction picks up the finished tree, as the editor does.
  return state.update({}).state;
}

describe("clearing JavaScript output", () => {
  it("removes output and error lines and keeps the code", () => {
    const doc = `//➜ 1\n//➜ 2\necho(1);\n\n//✗ Error\nfoo();\n//➜ x\necho("x");`;
    expect(clear(js(doc))).toBe(`echo(1);\n\nfoo();\necho("x");`);
  });

  it("removes output on the last line, without a newline after it", () => {
    expect(clear(js(`echo(1);\n//➜ 1\n//➜ 2`))).toBe(`echo(1);`);
    expect(clear(js(`//➜ 1`))).toBe(``);
  });

  it("keeps lines inside a string that look like output", () => {
    const doc = "//➜ 1\nconst s = `\n//➜ hi\n`;";
    expect(clear(js(doc))).toBe("const s = `\n//➜ hi\n`;");
  });

  it("removes an error inside a block", () => {
    expect(clear(js(`{\n//✗ Error\n  foo();\n}`))).toBe(`{\n  foo();\n}`);
  });

  it("leaves code without output unchanged", () => {
    expect(clearOutputChanges(js(`echo(1);\n// a comment`))).toEqual([]);
  });

  it("finds all of a long output once the parse is finished", () => {
    const output = Array.from({length: 20000}, (_, i) => `//➜ ${"x".repeat(40)} ${i}`).join("\n");
    const state = EditorState.create({doc: `echo(1);\n${output}\necho(2);`, extensions: [javascript(), outputLines]});
    const view = new EditorView({state, parent: document.body});
    try {
      forceParsing(view, view.state.doc.length, 5000);
      expect(clear(view.state)).toBe(`echo(1);\necho(2);`);
    } finally {
      view.destroy();
    }
  });
});

describe("clearing wenyan output", () => {
  it("removes output and keeps look-alike lines inside strings", () => {
    const state = EditorState.create({
      doc: `批曰。「「➜ 三」」。\n夫三。示之。\n吾有一言。曰「「甲\n批曰。「「➜ 乙」」。\n丙」」。名之曰「文」。`,
      extensions: wenyanSupport(),
    });
    expect(clear(state)).toBe(`夫三。示之。\n吾有一言。曰「「甲\n批曰。「「➜ 乙」」。\n丙」」。名之曰「文」。`);
  });
});
