import {HighlightStyle, StreamLanguage, syntaxHighlighting} from "@codemirror/language";
import {Tag, tags as t} from "@lezer/highlight";
import {KEYWORDS, NUMBER_KEYWORDS} from "wenyan";
import {wenyan} from "../../runtime/languages/wenyan.js";
import {blockMetadataExtension, blockUpdate, mapBlocks} from "../blocks/state.ts";
import {outputDecoration, outputLineFinder, outputLines} from "../blocks/output.ts";

// Longest first, so 若其不然者 wins over 若.
const keywords = Object.entries(KEYWORDS).sort(([a], [b]) => b.length - a.length);
const numerals = new Set(NUMBER_KEYWORDS);
const COMMENT = /^(批曰|注曰|疏曰)/;

// The runtime's names for parts of the stdlib (刻漏), bold like JavaScript's
// echo. Their tag is a variable name's, so they keep its colour.
const BUILTINS = new Set(Object.keys(wenyan.builtins({})));
const builtinTag = Tag.define(t.variableName);
const builtinStyle = syntaxHighlighting(HighlightStyle.define([{tag: builtinTag, fontWeight: "bold"}]));

const styleOf = (type) => {
  switch (type) {
    case "type":
      return "typeName";
    case "bool":
      return "bool";
    case "op":
    case "lop":
    case "cmp":
    case "not":
    case "mod":
      return "operator";
    default:
      return "keyword";
  }
};

// A comment is its keyword, a string and a closing 。, and the string can span
// lines: `state.comment` tracks how far into one we are ("open" after the
// keyword, "closing" after the string).
function token(stream, state) {
  if (state.string) {
    // Inside 「「…」」 or 『…』, which can span lines.
    while (!stream.eol()) {
      if (stream.match(state.string)) {
        state.string = null;
        if (state.comment) state.comment = "closing";
        break;
      }
      stream.next();
    }
    return state.comment ? "comment" : "string";
  }
  if (stream.match(COMMENT)) {
    state.comment = "open";
    return "comment";
  }
  if (stream.match("「「")) {
    state.string = "」」";
    return state.comment ? "comment" : "string";
  }
  if (stream.match("『")) {
    state.string = "』";
    return state.comment ? "comment" : "string";
  }
  if (stream.match("。")) {
    if (!state.comment) return "punctuation";
    if (state.comment === "closing") state.comment = null;
    return "comment";
  }
  // Anything else means the comment is over (or wasn't well-formed).
  state.comment = null;
  // 名之曰 names what follows, so a notebook's own 刻漏 isn't a builtin there.
  const naming = state.naming;
  state.naming = false;
  const name = stream.match(/^「([^」]*)」/);
  if (name) return !naming && BUILTINS.has(name[1]) ? "rechoBuiltin" : "variableName";
  if (numerals.has(stream.peek())) {
    while (numerals.has(stream.peek())) stream.next();
    return "number";
  }
  for (const [word, [type]] of keywords) {
    if (stream.match(word)) {
      state.naming = word === "名之曰";
      return styleOf(type);
    }
  }
  stream.next();
  return null;
}

const language = StreamLanguage.define({
  name: "wenyan",
  startState: () => ({string: null, comment: null, naming: false}),
  token,
  tokenTable: {rechoBuiltin: builtinTag},
  languageData: {
    // Wenyan has no line comments: a comment is a statement wrapping a
    // string. Cmd+/ wraps lines in 注曰。『…』。, since code often holds
    // 「「…」」 strings but rarely 『…』.
    commentTokens: {block: {open: "注曰。『", close: "』。"}},
  },
});

/**
 * Output lines for the dashed box around output, found the way the runtime
 * finds them (skipping look-alike lines inside strings).
 */
function findOutputLines(state) {
  // outputLines lists lines in document order.
  return [...wenyan.outputLines(state.doc.toString())].map(([n, type]) => ({from: state.doc.line(n + 1).from, type}));
}

/**
 * Editor support for wenyan-lang: syntax highlighting (built-ins bold), the blocks behind the
 * gutter's block indicator (moved along with edits until the next run), and
 * the box around output lines.
 */
export const wenyanSupport = () => [
  language,
  builtinStyle,
  blockMetadataExtension,
  blockUpdate.of(mapBlocks),
  outputLines,
  outputDecoration,
  outputLineFinder.of(findOutputLines),
];
