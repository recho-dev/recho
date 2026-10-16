import {StreamLanguage} from "@codemirror/language";
import {KEYWORDS, NUMBER_KEYWORDS} from "wenyan";

// Longest first, so 若其不然者 wins over 若.
const keywords = Object.entries(KEYWORDS).sort(([a], [b]) => b.length - a.length);
const numerals = new Set(NUMBER_KEYWORDS);
const COMMENT = /^(批曰|注曰|疏曰)/;

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
  if (stream.match(/^「[^」]*」/)) return "variableName";
  if (numerals.has(stream.peek())) {
    while (numerals.has(stream.peek())) stream.next();
    return "number";
  }
  for (const [word, [type]] of keywords) {
    if (stream.match(word)) return styleOf(type);
  }
  stream.next();
  return null;
}

const language = StreamLanguage.define({
  name: "wenyan",
  startState: () => ({string: null, comment: null}),
  token,
});

/** Editor support for wenyan-lang: syntax highlighting. */
export const wenyanSupport = () => [language];
