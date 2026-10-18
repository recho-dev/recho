import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
// @vitest-environment node
import {it, expect, describe, beforeAll} from "vitest";
import {readFile} from "node:fs/promises";
import {EditorState} from "@codemirror/state";
import {toggleComment} from "@codemirror/commands";
import {classHighlighter} from "@lezer/highlight";
import {Parser, Language, Query} from "web-tree-sitter";
import {captureTag, highlightSpans, mlscriptExtensions} from "../editor/languages/mlscript.js";
import {outputLinesField} from "../editor/blocks/output.ts";

const grammarUrl = pathToFileURL(
  createRequire(import.meta.url).resolve("@mlscript/tree-sitter-mlscript/tree-sitter-mlscript.wasm"),
);
let language, querySource, query, parser;

beforeAll(async () => {
  await Parser.init();
  language = await Language.load(new Uint8Array(await readFile(grammarUrl)));
  querySource = await readFile(new URL("queries/highlights.scm", grammarUrl), "utf8");
  query = new Query(language, querySource);
  parser = new Parser();
  parser.setLanguage(language);
});

/**
 * The highlighted spans of `doc` (between `from` and `to`), as
 * "text=capture=class" triples.
 */
function spans(doc, from, to) {
  const tree = parser.parse(doc);
  const result = highlightSpans(query, tree, from, to).map(
    ({from, to, capture, tag}) => `${doc.slice(from, to)}=${capture}=${classHighlighter.style([tag])}`,
  );
  tree.delete();
  return result;
}

describe("MLscript highlighting", () => {
  it("maps captures to the tags JavaScript uses", () => {
    const program = [
      "// Squares",
      'fun square(x) = x * 2 + "a\\n"',
      "let xs = [1, 2.5]",
      "if xs is Nil then print(true) else ()",
    ].join("\n");
    expect(spans(program)).toEqual([
      "// Squares=comment=tok-comment",
      "fun=keyword.function=tok-keyword",
      "square=function=tok-variableName tok-definition",
      "(=punctuation.bracket=tok-punctuation",
      "x=variable=tok-variableName",
      ")=punctuation.bracket=tok-punctuation",
      "==operator=tok-operator",
      "x=variable=tok-variableName",
      "*=operator=tok-operator",
      "2=number=tok-number",
      "+=operator=tok-operator",
      '"a\\n"=string=tok-string',
      "\\n=string.escape=tok-string2",
      "let=keyword.function=tok-keyword",
      "xs=variable=tok-variableName",
      "==operator=tok-operator",
      "[=punctuation.bracket=tok-punctuation",
      "1=number=tok-number",
      ",=punctuation.delimiter=tok-punctuation",
      "2.5=number=tok-number",
      "]=punctuation.bracket=tok-punctuation",
      "if=keyword.conditional=tok-keyword",
      "xs=variable=tok-variableName",
      "is=keyword.operator=tok-keyword",
      "Nil=type=tok-typeName",
      "then=keyword.conditional=tok-keyword",
      "print=function.call=tok-variableName",
      "(=punctuation.bracket=tok-punctuation",
      "true=constant.builtin=tok-bool",
      ")=punctuation.bracket=tok-punctuation",
      "else=keyword.conditional=tok-keyword",
      "(=punctuation.bracket=tok-punctuation",
      ")=punctuation.bracket=tok-punctuation",
    ]);
  });

  it("highlights only the given range, after non-ASCII text", () => {
    const doc = 'let 名字 = "😀"\nlet y = 2\nlet z = 3';
    const from = doc.indexOf("let y");
    expect(spans(doc, from, from + "let y = 2".length)).toEqual([
      "let=keyword.function=tok-keyword",
      "y=variable=tok-variableName",
      "==operator=tok-operator",
      "2=number=tok-number",
    ]);
  });

  it("falls back to a capture's prefix", () => {
    expect(captureTag("keyword.unknown")).toBe(captureTag("keyword"));
    expect(captureTag("comment.documentation")).toBe(captureTag("comment"));
    expect(captureTag("nothing")).toBe(null);
  });

  it("finds output lines and keeps them up to date on edits", () => {
    const doc = ["//➜ 1", "let x = 1", '"""', "//➜ not output", '"""', "//✗ error"].join("\n");
    let state = EditorState.create({doc, extensions: mlscriptExtensions(language, querySource)});
    const lines = (state) => state.field(outputLinesField).map(({from, type}) => [state.doc.lineAt(from).number, type]);
    expect(lines(state)).toEqual([
      [1, "output"],
      [6, "error"],
    ]);
    // Removing both quotes (one transaction, two changes) turns line 4 into a comment.
    const open = doc.indexOf('"""');
    const close = doc.lastIndexOf('"""');
    state = state.update({
      changes: [
        {from: open, to: open + 4},
        {from: close, to: close + 4},
      ],
    }).state;
    expect(state.doc.toString()).toBe(["//➜ 1", "let x = 1", "//➜ not output", "//✗ error"].join("\n"));
    expect(lines(state)).toEqual([
      [1, "output"],
      [3, "output"],
      [4, "error"],
    ]);
  });

  it("toggles `//` line comments", () => {
    let state = EditorState.create({doc: "let x = 1", extensions: mlscriptExtensions(language, querySource)});
    const run = () => toggleComment({state, dispatch: (tr) => (state = tr.state)});
    run();
    expect(state.doc.toString()).toBe("// let x = 1");
    run();
    expect(state.doc.toString()).toBe("let x = 1");
  });
});
