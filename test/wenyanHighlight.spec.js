import {it, expect, describe} from "vitest";
import {EditorState} from "@codemirror/state";
import {ensureSyntaxTree} from "@codemirror/language";
import {wenyanSupport} from "../editor/languages/wenyan.js";

/** The highlighted spans of `doc`, as "text=token" pairs. */
function tokens(doc) {
  const state = EditorState.create({doc, extensions: wenyanSupport()});
  const tree = ensureSyntaxTree(state, doc.length, 1e9);
  const spans = [];
  tree.iterate({
    enter: (node) => {
      if (node.from !== node.to && node.type.name !== "Document") {
        spans.push(`${doc.slice(node.from, node.to)}=${node.type.name}`);
      }
    },
  });
  return spans;
}

describe("wenyan highlighting", () => {
  it("highlights keywords, types, numbers, strings and names", () => {
    expect(tokens("吾有一言。曰「「問天地好在。」」。示之。")).toEqual([
      "吾有=keyword",
      "一=number",
      "言=typeName",
      "。=punctuation",
      "曰=keyword",
      "「「問天地好在。」」=string",
      "。=punctuation",
      "示之=keyword",
      "。=punctuation",
    ]);
    expect(tokens("夫「甲」。書之。")).toEqual([
      "夫=keyword",
      "「甲」=variableName",
      "。=punctuation",
      "書之=keyword",
      "。=punctuation",
    ]);
  });

  it("highlights comments, including output lines", () => {
    expect(tokens("批曰。「「➜ 三」」。")).toEqual(["批曰。「「➜ 三」」。=comment"]);
  });
});
