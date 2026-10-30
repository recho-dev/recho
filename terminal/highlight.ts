// Lightweight JavaScript syntax highlighting that emits styled spans for
// each line. Output line is treated specially: if the line begins with the
// runtime's output or error prefix it's colored as such. Everything else
// gets a single regex-based pass over keyword/number/string/comment.

import {fg, italic, reset, bold} from "./screen.ts";
import {OUTPUT_PREFIX, ERROR_PREFIX} from "../runtime/output.js";
import {BUILTINS} from "../runtime/builtins.js";

// Theme palettes (256-color indices). DARK is the default; setTheme swaps
// the palette in place so every `COLORS.x` reference picks up the change.
const DARK = {
  fg: 252,
  comment: 244,
  keyword: 175,
  string: 150,
  number: 222,
  fn: 110,
  punct: 246,
  output: 114, // green
  error: 203, // red
  output_dim: 65,
  ln: 240,
  lnActive: 252,
  border: 240,
  borderHi: 250,
  title: 252,
  status: 250,
  dimText: 245,
  panelBg: 235,
  selBg: 24,
  cursorLineBg: 236,
  outputBg: 234,
  marker: 110,
  hot: 209,
  chromeBg: 234,
  modalBg: 233,
  selFg: 255,
};

// Dark-on-light equivalents, tuned for contrast on white-ish backgrounds
// (the light analogs of the dark values — e.g. number 222 is a pale yellow
// that vanishes on white, so it becomes a mid-brown).
const LIGHT: typeof DARK = {
  fg: 235,
  comment: 59,
  keyword: 125,
  string: 64,
  number: 130,
  fn: 25,
  punct: 240,
  output: 28, // green
  error: 160, // red
  output_dim: 65,
  ln: 249,
  lnActive: 238,
  border: 250,
  borderHi: 244,
  title: 235,
  status: 238,
  dimText: 102,
  panelBg: 255,
  selBg: 153,
  cursorLineBg: 254,
  outputBg: 255,
  marker: 25,
  hot: 166,
  chromeBg: 252,
  modalBg: 255,
  selFg: 235,
};

const C = {...DARK};

export function setTheme(theme: "dark" | "light") {
  Object.assign(C, theme === "light" ? LIGHT : DARK);
}

export const COLORS = C;
export type ColorName = keyof typeof C;

const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "async",
  "await",
]);

export type HighlightState = {inBlockComment: boolean};

const INITIAL_STATE: HighlightState = {inBlockComment: false};
const STRING_RE = /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^\\`])*`)/;
const NUMBER_RE = /^\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b/i;
const IDENT_RE = /^[A-Za-z_$][\w$]*/;
const PUNCT_RE = /^[{}()[\];,.<>:?!+\-*/%=&|^~]/;

function styleComment(text: string): string {
  return fg(C.comment) + italic + text + reset + fg(C.fg);
}

function styleToken(tok: string, line: string, index: number): string {
  let style: string;
  if (tok[0] === '"' || tok[0] === "'" || tok[0] === "`") style = fg(C.string);
  else if (/^\d/.test(tok)) style = fg(C.number);
  else if (/^[A-Za-z_$]/.test(tok) && KEYWORDS.has(tok)) style = fg(C.keyword) + bold;
  else if (/^[A-Za-z_$]/.test(tok)) {
    const next = line[index + tok.length];
    if (next === "(") style = fg(C.fn);
    else style = fg(C.fg);
    // Recho's own names are bold, unless read as a property (`obj.echo`,
    // `obj. echo`) or a private field (`#echo`).
    const before = line.slice(0, index).trimEnd().slice(-1);
    if (BUILTINS.has(tok) && before !== "." && line[index - 1] !== "#") style += bold;
  } else style = fg(C.punct);

  return style + tok + reset + fg(C.fg);
}

export function nextHighlightState(line: string, state: HighlightState = INITIAL_STATE): HighlightState {
  let inBlockComment = state.inBlockComment;
  let quote: string | null = null;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "/" && next === "/") break;
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
  }

  return {inBlockComment};
}

// An SGR sequence; it resets the colours when its parameters include `0`
// (or nothing), `39` (foreground) or `49` (background).
const SGR = /\x1b\[([\d;]*)m/g;

// `line` with `color` applied again after every reset inside it, so coloured
// output (SGR in the line itself) doesn't drop the line's colour after it.
function keepColor(line: string, color: string): string {
  if (!line.includes("\x1b[")) return line;
  return line.replace(SGR, (sequence, params: string) =>
    params.split(";").some((p) => p === "" || p === "0" || p === "39" || p === "49") ? sequence + color : sequence,
  );
}

// Highlight a single line of source (without the runtime output prefix).
// Returns a styled string (length = visible chars equal to `line`).
export function highlightLine(line: string, state: HighlightState = INITIAL_STATE): string {
  // Comment? Whole-line color.
  const trimmed = line.trimStart();
  if (trimmed.startsWith(OUTPUT_PREFIX) || trimmed.startsWith("//➜")) {
    return fg(C.output) + keepColor(line, fg(C.output)) + reset;
  }
  if (trimmed.startsWith(ERROR_PREFIX) || trimmed.startsWith("//✗")) {
    return fg(C.error) + line + reset;
  }
  if (trimmed.startsWith("//")) {
    return fg(C.comment) + italic + line + reset;
  }

  let out = fg(C.fg);
  let i = 0;
  let inBlockComment = state.inBlockComment;

  while (i < line.length) {
    if (inBlockComment) {
      const end = line.indexOf("*/", i);
      if (end === -1) {
        out += styleComment(line.slice(i));
        break;
      }
      out += styleComment(line.slice(i, end + 2));
      i = end + 2;
      inBlockComment = false;
      continue;
    }

    if (line.startsWith("//", i)) {
      out += styleComment(line.slice(i));
      break;
    }
    if (line.startsWith("/*", i)) {
      const end = line.indexOf("*/", i + 2);
      if (end === -1) {
        out += styleComment(line.slice(i));
        break;
      }
      out += styleComment(line.slice(i, end + 2));
      i = end + 2;
      continue;
    }

    const rest = line.slice(i);
    const token =
      rest.match(STRING_RE)?.[0] ??
      rest.match(NUMBER_RE)?.[0] ??
      rest.match(IDENT_RE)?.[0] ??
      rest.match(PUNCT_RE)?.[0];

    if (token) {
      out += styleToken(token, line, i);
      i += token.length;
    } else {
      out += line[i];
      i++;
    }
  }

  out += reset;
  return out;
}
