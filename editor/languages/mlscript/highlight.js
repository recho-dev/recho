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

const TEXT = "#24292E";

/**
 * Shiki's github-light colours for the captures of the highlights query, as it
 * colours the JavaScript equivalents: keywords and operators red, function and
 * type names purple, literals blue, strings navy, comments grey, and names,
 * members and punctuation in the text colour.
 */
const COLORS = {
  comment: "#6A737D",
  string: "#032F62",
  "string.escape": "#005CC5",
  number: "#005CC5",
  "constant.builtin": "#005CC5",
  "variable.builtin": "#005CC5",
  keyword: "#D73A49",
  operator: "#D73A49",
  attribute: "#6F42C1",
  function: "#6F42C1",
  type: "#6F42C1",
  module: "#6F42C1",
  variable: TEXT,
  punctuation: TEXT,
};

export const captureColor = (name) => captureValue(COLORS, name);

const escapeHtml = (text) => text.replace(/&/g, "&#x26;").replace(/</g, "&#x3C;").replace(/>/g, "&#x3E;");

/**
 * MLscript code as the HTML Shiki makes with the github-light theme: a `<pre>`
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
  return `<pre class="shiki github-light" style="background-color:#fff;color:#24292e" tabindex="0"><code>${lines.join("\n")}</code></pre>`;
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
