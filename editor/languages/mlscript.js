import {EditorState, StateField} from "@codemirror/state";
import {Decoration, ViewPlugin} from "@codemirror/view";
import {highlightingFor} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";
import {Parser, Language, Query} from "web-tree-sitter";
import {markLineType} from "../../lib/blocks/detect.ts";
import {blockMetadataExtension, blockUpdate, mapBlocks} from "../blocks/state.ts";
import {outputDecoration, outputLineFinder, outputLines} from "../blocks/output.ts";

// The tree-sitter grammar and its highlights query, from the
// @mlscript/tree-sitter-mlscript package. This module is only loaded for
// MLscript notebooks, and they are only fetched from here.
const GRAMMAR_URL = new URL("@mlscript/tree-sitter-mlscript/tree-sitter-mlscript.wasm", import.meta.url);
const QUERY_URL = new URL("@mlscript/tree-sitter-mlscript/queries/highlights.scm", import.meta.url);

/**
 * The highlight tag for a capture of the highlights query, so MLscript gets
 * the same colours as JavaScript (whose tags come from @lezer/javascript).
 * A dotted capture falls back to its prefix: `@keyword.foo` is a keyword.
 */
const TAGS = {
  comment: t.lineComment,
  string: t.string,
  "string.escape": t.escape,
  "string.special.path": t.string,
  number: t.number,
  "constant.builtin": t.bool,
  "variable.builtin": t.self,
  keyword: t.keyword,
  "keyword.type": t.definitionKeyword,
  "keyword.function": t.definitionKeyword,
  "keyword.conditional": t.controlKeyword,
  "keyword.return": t.controlKeyword,
  "keyword.import": t.moduleKeyword,
  "keyword.operator": t.operatorKeyword,
  "keyword.modifier": t.modifier,
  attribute: t.annotation,
  operator: t.operator,
  "punctuation.bracket": t.bracket,
  "punctuation.delimiter": t.separator,
  function: t.function(t.definition(t.variableName)),
  "function.call": t.function(t.variableName),
  "function.macro": t.macroName,
  variable: t.variableName,
  "variable.member": t.propertyName,
  type: t.typeName,
  module: t.namespace,
};

export function captureTag(name) {
  for (let key = name; ; key = key.slice(0, key.lastIndexOf("."))) {
    if (key in TAGS) return TAGS[key];
    if (!key.includes(".")) return null;
  }
}

/**
 * The highlighted spans of `tree` between `from` and `to`, as `{from, to,
 * capture, tag}`, sorted by position (outer spans first). When patterns
 * capture the same node, the first one in the query wins, as the query's more
 * specific patterns come before the catch-all `(identifier)` ones.
 */
export function highlightSpans(query, tree, from = 0, to = tree.rootNode.endIndex) {
  const byNode = new Map();
  // Nodes report UTF-16 indices, but web-tree-sitter 0.26.9 passes a query's
  // range to tree-sitter as is, where it means bytes of UTF-16 text.
  for (const capture of query.captures(tree.rootNode, {startIndex: from * 2, endIndex: to * 2})) {
    const tag = captureTag(capture.name);
    const {startIndex, endIndex, id} = capture.node;
    if (!tag || startIndex === endIndex) continue;
    const seen = byNode.get(id);
    if (seen && seen.patternIndex <= capture.patternIndex) continue;
    byNode.set(id, {from: startIndex, to: endIndex, capture: capture.name, tag, patternIndex: capture.patternIndex});
  }
  return [...byNode.values()]
    .sort((a, b) => a.from - b.from || b.to - a.to)
    .map(({from, to, capture, tag}) => ({from, to, capture, tag}));
}

/** Where `text` would end if inserted at `point` (rows and UTF-16 columns). */
function endPoint(point, text) {
  const lines = text.split("\n");
  if (lines.length === 1) return {row: point.row, column: point.column + text.length};
  return {row: point.row + lines.length - 1, column: lines[lines.length - 1].length};
}

function pointAt(doc, pos) {
  const line = doc.lineAt(pos);
  return {row: line.number - 1, column: pos - line.from};
}

/**
 * The document's syntax tree, updated incrementally on edits. Trees live in
 * WebAssembly memory, so `treeCleanup` frees those of states the view has
 * moved past.
 */
function treeField(parser) {
  return StateField.define({
    create: (state) => parser.parse(state.doc.toString()),
    update(tree, tr) {
      if (!tr.docChanged) return tree;
      const edited = tree.copy();
      // Changes are in old-document positions; applying them from last to
      // first keeps the positions of the earlier ones valid.
      const changes = [];
      tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => changes.push([fromA, toA, inserted]));
      for (const [fromA, toA, inserted] of changes.reverse()) {
        const startPosition = pointAt(tr.startState.doc, fromA);
        edited.edit({
          startIndex: fromA,
          oldEndIndex: toA,
          newEndIndex: fromA + inserted.length,
          startPosition,
          oldEndPosition: pointAt(tr.startState.doc, toA),
          newEndPosition: endPoint(startPosition, inserted.toString()),
        });
      }
      const next = parser.parse(tr.state.doc.toString(), edited);
      edited.delete();
      return next;
    },
  });
}

function treeCleanup(field) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
      }
      update(update) {
        const current = update.state.field(field);
        for (const tr of update.transactions) {
          const old = tr.startState.field(field);
          if (old !== current) old.delete();
        }
      }
      destroy() {
        this.view.state.field(field).delete();
      }
    },
  );
}

function highlighter(field, query) {
  const marks = new Map();
  const markFor = (cls) => {
    if (!marks.has(cls)) marks.set(cls, Decoration.mark({class: cls}));
    return marks.get(cls);
  };
  const build = (view) => {
    const tree = view.state.field(field);
    const ranges = [];
    for (const {from, to} of view.visibleRanges) {
      for (const span of highlightSpans(query, tree, from, to)) {
        const cls = highlightingFor(view.state, [span.tag]);
        if (cls) ranges.push(markFor(cls).range(span.from, span.to));
      }
    }
    return Decoration.set(ranges, true);
  };
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.startState.field(field) !== update.state.field(field)
        ) {
          this.decorations = build(update.view);
        }
      }
    },
    {decorations: (v) => v.decorations},
  );
}

/**
 * Output lines are `//➜` and `//✗` comments covering a whole line, which
 * excludes look-alike lines inside `"""` strings and block comments.
 */
function outputLineFinderFor(field) {
  return (state) => {
    const tree = state.field(field);
    const lines = [];
    for (let n = 1; n <= state.doc.lines; n++) {
      const line = state.doc.line(n);
      const type = markLineType(line.text);
      if (type === null) continue;
      const node = tree.rootNode.descendantForIndex(line.from, line.to);
      if (node?.type === "comment" && node.startIndex === line.from && node.endIndex === line.to) {
        lines.push({from: line.from, type});
      }
    }
    return lines;
  };
}

/**
 * Editor extensions for MLscript from a loaded grammar and highlights query.
 * @param {Language} language
 * @param {string} querySource
 */
export function mlscriptExtensions(language, querySource) {
  const parser = new Parser();
  parser.setLanguage(language);
  const query = new Query(language, querySource);
  const field = treeField(parser);
  return [
    field,
    treeCleanup(field),
    highlighter(field, query),
    blockMetadataExtension,
    blockUpdate.of(mapBlocks),
    outputLines,
    outputDecoration,
    outputLineFinder.of(outputLineFinderFor(field)),
    // Cmd+/ toggles `//` line comments (Shift+Alt+A uses `/* */`).
    EditorState.languageData.of(() => [{commentTokens: {line: "//", block: {open: "/*", close: "*/"}}}]),
  ];
}

let loading = null;

function load() {
  return (loading ??= (async () => {
    const [, query] = await Promise.all([Parser.init(), fetch(QUERY_URL).then((r) => r.text())]);
    const language = await Language.load(new Uint8Array(await (await fetch(GRAMMAR_URL)).arrayBuffer()));
    return {language, query};
  })().catch((error) => {
    loading = null;
    throw error;
  }));
}

/**
 * Editor support for MLscript: syntax highlighting with the tree-sitter
 * grammar, the blocks behind the gutter's block indicator (moved along with
 * edits until the next run), and the box around output lines.
 */
export async function mlscriptSupport() {
  const {language, query} = await load();
  return mlscriptExtensions(language, query);
}
