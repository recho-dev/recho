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

function token(stream, state) {
  if (state.string) {
    // Inside 「「…」」 or 『…』, which can span lines.
    while (!stream.eol()) {
      if (stream.match(state.string)) {
        state.string = null;
        break;
      }
      stream.next();
    }
    return "string";
  }
  if (stream.sol() && stream.match(COMMENT, false)) {
    stream.skipToEnd();
    return "comment";
  }
  if (stream.match("「「")) {
    state.string = "」」";
    return "string";
  }
  if (stream.match("『")) {
    state.string = "』";
    return "string";
  }
  if (stream.match(/^「[^」]*」/)) return "variableName";
  if (stream.match("。")) return "punctuation";
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
  startState: () => ({string: null}),
  token,
});

/** Editor support for wenyan-lang: syntax highlighting. */
export const wenyanSupport = () => [language];
