import {it, expect, describe} from "vitest";
import {EditorSelection, EditorState} from "@codemirror/state";
import {toggleComment} from "@codemirror/commands";
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

  it("highlights 獨行此 blocks", () => {
    expect(tokens("獨行此。\n\t夫三。示之。\n云云。")).toEqual([
      "獨行此=keyword",
      "。=punctuation",
      "夫=keyword",
      "三=number",
      "。=punctuation",
      "示之=keyword",
      "。=punctuation",
      "云云=keyword",
      "。=punctuation",
    ]);
  });

  it("highlights comments, including output lines", () => {
    // Neighbouring spans of the same style are merged into one.
    expect(tokens("批曰。「「➜ 三」」。")).toEqual(["批曰。「「➜ 三」」。=comment"]);
  });

  it("highlights a comment that spans lines, and the code after it", () => {
    expect(tokens("注曰。「「多\n行」」。\n夫三。示之。")).toEqual([
      "注曰。「「多=comment",
      "行」」。=comment",
      "夫=keyword",
      "三=number",
      "。=punctuation",
      "示之=keyword",
      "。=punctuation",
    ]);
  });
});

/** Run Cmd+/ (toggleComment) with the given selection and return the code. */
function toggle(doc, from, to = from) {
  let state = EditorState.create({doc, selection: EditorSelection.range(from, to), extensions: wenyanSupport()});
  toggleComment({state, dispatch: (tr) => (state = tr.state)});
  return state.doc.toString();
}

describe("wenyan comment toggling (Cmd+/)", () => {
  it("wraps a line in 注曰。『…』。 and unwraps it", () => {
    const line = "吾有一言。曰「「問天地好在。」」。示之。";
    const commented = toggle(line, 3);
    expect(commented).toBe("注曰。『 吾有一言。曰「「問天地好在。」」。示之。 』。");
    expect(toggle(commented, 5)).toBe(line);
  });

  it("wraps several lines in one comment", () => {
    const code = "為是三遍。\n\t夫「甲」。示之。\n云云。";
    const commented = toggle(code, 0, code.length);
    expect(commented).toBe("注曰。『 為是三遍。\n\t夫「甲」。示之。\n云云。 』。");
    expect(toggle(commented, 0, commented.length)).toBe(code);
  });

  it("keeps the indentation of an indented line", () => {
    const code = "為是三遍。\n\t夫「甲」。示之。\n云云。";
    expect(toggle(code, code.indexOf("夫") + 1)).toBe("為是三遍。\n\t注曰。『 夫「甲」。示之。 』。\n云云。");
  });

  it("highlights commented-out code as a comment", () => {
    expect(tokens("注曰。『 夫三。\n示之。 』。\n夫四。")).toEqual([
      "注曰。『 夫三。=comment",
      "示之。 』。=comment",
      "夫=keyword",
      "四=number",
      "。=punctuation",
    ]);
  });
});
