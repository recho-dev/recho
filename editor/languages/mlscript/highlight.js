// Highlighting with the tree-sitter grammar that doesn't depend on CodeMirror,
// so thumbnails can use it in Node (at build time) and in the browser.

import {Parser, Query} from "web-tree-sitter";

/** The value of `map` for a capture name; `@a.b` falls back to `@a`. */
export function captureValue(map, name) {
  for (let key = name; ; key = key.slice(0, key.lastIndexOf("."))) {
    if (key in map) return map[key];
    if (!key.includes(".")) return null;
  }
}

/**
 * The highlighted spans of `tree` between `from` and `to`, as `{from, to,
 * capture, value}` where `value = classify(capture)` isn't null, sorted by
 * position (outer spans first). When patterns capture the same node, the first
 * one in the query wins, as the query's more specific patterns come before the
 * catch-all `(identifier)` ones.
 */
export function captureSpans(query, tree, classify, from = 0, to = tree.rootNode.endIndex) {
  const byNode = new Map();
  // Nodes report UTF-16 indices, but web-tree-sitter 0.26.9 passes a query's
  // range to tree-sitter as is, where it means bytes of UTF-16 text.
  for (const capture of query.captures(tree.rootNode, {startIndex: from * 2, endIndex: to * 2})) {
    const value = classify(capture.name);
    const {startIndex, endIndex, id} = capture.node;
    if (value == null || startIndex === endIndex) continue;
    const seen = byNode.get(id);
    if (seen && seen.patternIndex <= capture.patternIndex) continue;
    byNode.set(id, {from: startIndex, to: endIndex, capture: capture.name, value, patternIndex: capture.patternIndex});
  }
  return [...byNode.values()]
    .sort((a, b) => a.from - b.from || b.to - a.to)
    .map(({from, to, capture, value}) => ({from, to, capture, value}));
}

const TEXT = "var(--ink)";

/**
 * The syntax tokens of the app's theme (app/tokens.css) for the captures of
 * the highlights query, as app/codeTheme.js colours the JavaScript
 * equivalents: keywords, function and type names, literals, strings and
 * comments each in their token, operators and punctuation quiet, and names in
 * the text colour.
 */
const COLORS = {
  comment: "var(--syn-comment)",
  string: "var(--syn-string)",
  "string.escape": "var(--syn-number)",
  number: "var(--syn-number)",
  "constant.builtin": "var(--syn-number)",
  "variable.builtin": "var(--syn-keyword)",
  keyword: "var(--syn-keyword)",
  operator: "var(--syn-operator)",
  attribute: "var(--syn-function)",
  function: "var(--syn-function)",
  type: "var(--syn-function)",
  module: "var(--syn-function)",
  variable: TEXT,
  punctuation: "var(--syn-operator)",
};

export const captureColor = (name) => captureValue(COLORS, name);

const escapeHtml = (text) => text.replace(/&/g, "&#x26;").replace(/</g, "&#x3C;").replace(/>/g, "&#x3E;");

/**
 * MLscript code as the HTML Shiki makes with app/codeTheme.js: a `<pre>`
 * with a `<span class="line">` per line, each made of coloured `<span>`s.
 * @param {import("web-tree-sitter").Parser} parser
 * @param {import("web-tree-sitter").Query} query
 * @param {string} code
 */
export function highlightHtml(parser, query, code) {
  const colors = new Array(code.length).fill(TEXT);
  const tree = parser.parse(code);
  try {
    // Outer spans come first, so inner ones paint over them.
    for (const {from, to, value} of captureSpans(query, tree, captureColor)) colors.fill(value, from, to);
  } finally {
    tree.delete();
  }
  const lines = [];
  let start = 0;
  for (const text of code.split("\n")) {
    let html = "";
    for (let i = 0; i < text.length; ) {
      let j = i + 1;
      while (j < text.length && colors[start + j] === colors[start + i]) j++;
      html += `<span style="color:${colors[start + i]}">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
    }
    lines.push(`<span class="line">${html}</span>`);
    start += text.length + 1;
  }
  return `<pre class="shiki recho" style="background-color:var(--clear);color:var(--ink)" tabindex="0"><code>${lines.join("\n")}</code></pre>`;
}

/**
 * A function from MLscript code to Shiki-like HTML, for a loaded grammar.
 * @param {import("web-tree-sitter").Language} language
 * @param {string} querySource
 */
export function createHighlighter(language, querySource) {
  const parser = new Parser();
  parser.setLanguage(language);
  const query = new Query(language, querySource);
  return (code) => highlightHtml(parser, query, code);
}
