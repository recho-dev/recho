import {describe, expect, it} from "vitest";
import {EditorState} from "@codemirror/state";
import {javascript} from "@codemirror/lang-javascript";
import {ensureSyntaxTree} from "@codemirror/language";
import {builtinRanges} from "../editor/builtinHighlight.js";

function marked(code) {
  const state = EditorState.create({doc: code, extensions: [javascript()]});
  ensureSyntaxTree(state, state.doc.length, 5000);
  return builtinRanges(state).map(({from, to}) => code.slice(from, to));
}

describe("built-in highlighting", () => {
  it("marks echo, invalidation and recho where they are read", () => {
    expect(marked("echo(1);\necho.clear();\nrecho.state(0);\ninvalidation.then(() => {});")).toEqual([
      "echo",
      "echo",
      "recho",
      "invalidation",
    ]);
  });

  it("skips properties, definitions, other names and comments", () => {
    const code = [
      "obj.echo;",
      "const echo2 = 1;",
      "function f(invalidation) {}",
      "echoes;",
      "//➜ echo",
      "/* recho */",
      '"echo";',
    ].join("\n");
    expect(marked(code)).toEqual([]);
  });
});
