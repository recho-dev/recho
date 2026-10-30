// ANSI escape sequences in output: Recho keeps SGR (Select Graphic
// Rendition, `ESC[...m`), which colours and styles text, and strips every
// other escape (cursor moves, clears, OSC links). Shared by the runtime (which
// writes output), the editor (which draws it) and thumbnails.

// Any escape sequence: CSI (`ESC[` or the C1 byte 0x9B, parameters, final
// byte), OSC (`ESC]` up to BEL or ST), other two-byte escapes, or a lone ESC.
const ESCAPE = /(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[@-Z\\-_]|\x1b/g;

// An SGR sequence. Only the `ESC[` form is kept.
const SGR = /^\x1b\[([0-9;:]*)m$/;

const HAS_ESCAPE = /[\x1b\x9b]/;

/** @typedef {number | string | null} Color An index 0–255, a `#rrggbb` truecolor, or the default. */
/**
 * @typedef {object} Style
 * @property {Color} fg
 * @property {Color} bg
 * @property {boolean} bold
 * @property {boolean} dim
 * @property {boolean} italic
 * @property {boolean} underline
 * @property {boolean} inverse
 * @property {boolean} strike
 */
/** @typedef {{text: string, style: Style}} Run */

const FLAGS = ["bold", "dim", "italic", "underline", "inverse", "strike"];

/** @type {Style} */
export const DEFAULT_STYLE = Object.freeze({
  fg: null,
  bg: null,
  bold: false,
  dim: false,
  italic: false,
  underline: false,
  inverse: false,
  strike: false,
});

/** Whether `string` contains an escape sequence of any kind. */
export function hasEscape(string) {
  return HAS_ESCAPE.test(string);
}

/** Whether `string` contains an SGR sequence. */
export function hasSGR(string) {
  if (!hasEscape(string)) return false;
  for (const match of string.matchAll(ESCAPE)) if (SGR.test(match[0])) return true;
  return false;
}

/** `string` without any escape sequences: the text it shows. */
export function stripAnsi(string) {
  return hasEscape(string) ? string.replace(ESCAPE, "") : string;
}

/** The number of characters `string` shows, ignoring escape sequences. */
export function visibleLength(string) {
  return stripAnsi(string).length;
}

/** `string` padded with spaces to show `width` characters. */
export function padEnd(string, width) {
  const length = visibleLength(string);
  return length >= width ? string : string + " ".repeat(width - length);
}

export function sameStyle(a, b) {
  if (a === b) return true;
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.inverse === b.inverse &&
    a.strike === b.strike
  );
}

function isDefault(style) {
  return sameStyle(style, DEFAULT_STYLE);
}

function hex(r, g, b) {
  const byte = (n) =>
    Math.max(0, Math.min(255, n | 0))
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/**
 * The colour an extended colour parameter (38 or 48) sets, and how many
 * parameters it used. Handles `38;5;n`, `38;2;r;g;b` and the colon forms
 * `38:5:n`, `38:2:r:g:b`, `38:2::r:g:b`.
 */
function extendedColor(params, i) {
  const sub = params[i].split(":");
  if (sub.length > 1) {
    const [, mode, ...rest] = sub.map((s) => (s === "" ? NaN : Number(s)));
    if (mode === 5 && rest.length >= 1) return {color: rest[0] & 255, used: 1};
    if (mode === 2) {
      const rgb = rest.length >= 4 ? rest.slice(1) : rest;
      if (rgb.length >= 3) return {color: hex(rgb[0], rgb[1], rgb[2]), used: 1};
    }
    return {color: undefined, used: 1};
  }
  const mode = Number(params[i + 1]);
  if (mode === 5) {
    const n = Number(params[i + 2]);
    return {color: Number.isFinite(n) ? n & 255 : undefined, used: 3};
  }
  if (mode === 2) {
    const [r, g, b] = params.slice(i + 2, i + 5).map(Number);
    return {color: [r, g, b].every(Number.isFinite) ? hex(r, g, b) : undefined, used: 5};
  }
  return {color: undefined, used: 1};
}

/** The style after applying the parameters of one SGR sequence to `style`. */
function applySGR(style, paramString) {
  const params = paramString === "" ? ["0"] : paramString.split(";");
  const next = {...style};
  for (let i = 0; i < params.length; ) {
    const code = Number(params[i].split(":")[0] || 0);
    if (code === 38 || code === 48) {
      const {color, used} = extendedColor(params, i);
      if (color !== undefined) next[code === 38 ? "fg" : "bg"] = color;
      i += used;
      continue;
    }
    i++;
    if (code === 0) Object.assign(next, DEFAULT_STYLE);
    else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4 || code === 21) next.underline = true;
    else if (code === 7) next.inverse = true;
    else if (code === 9) next.strike = true;
    else if (code === 22) next.bold = next.dim = false;
    else if (code === 23) next.italic = false;
    else if (code === 24) next.underline = false;
    else if (code === 27) next.inverse = false;
    else if (code === 29) next.strike = false;
    else if (code >= 30 && code <= 37) next.fg = code - 30;
    else if (code === 39) next.fg = null;
    else if (code >= 40 && code <= 47) next.bg = code - 40;
    else if (code === 49) next.bg = null;
    else if (code >= 90 && code <= 97) next.fg = code - 90 + 8;
    else if (code >= 100 && code <= 107) next.bg = code - 100 + 8;
  }
  return sameStyle(next, style) ? style : isDefault(next) ? DEFAULT_STYLE : Object.freeze(next);
}

/**
 * The runs of text in `string`, each with one style, starting from `style`.
 * Adjacent runs with the same style are merged and empty runs dropped;
 * escapes other than SGR are ignored.
 *
 * @param {string} string
 * @param {Style} [style]
 * @returns {Run[]}
 */
export function parse(string, style = DEFAULT_STYLE) {
  /** @type {Run[]} */
  const runs = [];
  const push = (text) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && sameStyle(last.style, style)) last.text += text;
    else runs.push({text, style});
  };
  if (!hasEscape(string)) {
    push(string);
    return runs;
  }
  let index = 0;
  for (const match of string.matchAll(ESCAPE)) {
    push(string.slice(index, match.index));
    index = match.index + match[0].length;
    const sgr = match[0].match(SGR);
    if (sgr) style = applySGR(style, sgr[1]);
  }
  push(string.slice(index));
  return runs;
}

/**
 * Where the escapes and the styled text are in `string`, as offsets into it:
 * `escapes`, every escape sequence (they don't show), and `runs`, the text
 * with a style other than the default, each with its style. Runs with the
 * same style that only escapes separate are merged.
 *
 * @param {string} string
 * @param {Style} [style]
 * @returns {{escapes: {from: number, to: number}[], runs: {from: number, to: number, style: Style}[]}}
 */
export function locate(string, style = DEFAULT_STYLE) {
  const escapes = [];
  const runs = [];
  let last = null;
  const text = (from, to) => {
    if (from === to) return;
    if (isDefault(style)) last = null;
    else if (last && sameStyle(last.style, style)) last.to = to;
    else runs.push((last = {from, to, style}));
  };
  if (!hasEscape(string)) {
    text(0, string.length);
    return {escapes, runs};
  }
  let index = 0;
  for (const match of string.matchAll(ESCAPE)) {
    text(index, match.index);
    index = match.index + match[0].length;
    escapes.push({from: match.index, to: index});
    const sgr = match[0].match(SGR);
    if (sgr) style = applySGR(style, sgr[1]);
  }
  text(index, string.length);
  return {escapes, runs};
}

/** The style at the end of `string`, starting from `style`. */
function endStyle(string, style = DEFAULT_STYLE) {
  for (const match of string.matchAll(ESCAPE)) {
    const sgr = match[0].match(SGR);
    if (sgr) style = applySGR(style, sgr[1]);
  }
  return style;
}

function colorParams(color, base) {
  if (typeof color === "string") {
    const n = parseInt(color.slice(1), 16);
    return [base + 8, 2, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  if (color < 8) return [base + color];
  if (color < 16) return [base + 60 + color - 8];
  return [base + 8, 5, color];
}

/** The shortest SGR sequence that turns style `a` into style `b`, or "". */
export function transition(a, b) {
  if (sameStyle(a, b)) return "";
  if (isDefault(b)) {
    // One reset is shorter than several attributes switched off one by one.
    const off = FLAGS.filter((f) => a[f]).length + (a.fg !== null) + (a.bg !== null);
    if (off > 1) return "\x1b[0m";
  }
  const params = [];
  // 22 clears both bold and dim, so whichever stays is set again below.
  const intensityOff = (a.bold && !b.bold) || (a.dim && !b.dim);
  if (intensityOff) params.push(22);
  if (a.italic && !b.italic) params.push(23);
  if (a.underline && !b.underline) params.push(24);
  if (a.inverse && !b.inverse) params.push(27);
  if (a.strike && !b.strike) params.push(29);
  if (b.bold && (!a.bold || intensityOff)) params.push(1);
  if (b.dim && (!a.dim || intensityOff)) params.push(2);
  if (b.italic && !a.italic) params.push(3);
  if (b.underline && !a.underline) params.push(4);
  if (b.inverse && !a.inverse) params.push(7);
  if (b.strike && !a.strike) params.push(9);
  if (a.fg !== b.fg) params.push(...(b.fg === null ? [39] : colorParams(b.fg, 30)));
  if (a.bg !== b.bg) params.push(...(b.bg === null ? [49] : colorParams(b.bg, 40)));
  return `\x1b[${params.join(";")}m`;
}

/** `runs` as text with the fewest SGR codes, back in the default style at the end. */
export function serialize(runs) {
  let output = "";
  let style = DEFAULT_STYLE;
  for (const run of runs) {
    output += transition(style, run.style) + run.text;
    style = run.style;
  }
  return output + transition(style, DEFAULT_STYLE);
}

/**
 * `string` with only its SGR sequences kept, as few of them as needed, and
 * each line self-contained: a style that spans a line break is closed at the
 * end of the line and opened again on the next, since every line of output
 * is drawn (and may be copied) on its own.
 */
export function normalize(string) {
  if (!hasEscape(string)) return string;
  let style = DEFAULT_STYLE;
  return string
    .split("\n")
    .map((line) => {
      const runs = parse(line, style);
      style = endStyle(line, style);
      return serialize(runs);
    })
    .join("\n");
}

/**
 * `string` cut to show at most `limit` characters, followed by `ellipsis`
 * when cut. Never cuts inside an escape sequence.
 */
export function truncate(string, limit, ellipsis = "…") {
  if (visibleLength(string) <= limit) return string;
  const kept = [];
  let left = limit;
  for (const run of parse(string)) {
    if (left <= 0) break;
    kept.push({text: run.text.slice(0, left), style: run.style});
    left -= run.text.length;
  }
  return serialize(kept) + ellipsis;
}

const NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

/** The CSS colour for an ANSI colour: a palette token for the 16 colours, else RGB. */
export function cssColor(color) {
  if (typeof color === "string") return color;
  if (color < 8) return `var(--ansi-${NAMES[color]})`;
  if (color < 16) return `var(--ansi-bright-${NAMES[color - 8]})`;
  if (color < 232) {
    const levels = [0, 95, 135, 175, 215, 255];
    const n = color - 16;
    return hex(levels[Math.floor(n / 36)], levels[Math.floor(n / 6) % 6], levels[n % 6]);
  }
  const gray = 8 + (color - 232) * 10;
  return hex(gray, gray, gray);
}

// Text on a background with no colour of its own: dark ink on a light
// background and light ink on a dark one, picked by CSS from the background's
// lightness, so it holds for palette tokens in both themes and for RGB. Where
// relative colours aren't supported the first declaration, full ink, stays.
function inkOn(bg) {
  return `var(--ink);color:oklch(from ${bg} clamp(0.2, calc((0.62 - l) * 1000), 0.98) 0.005 70)`;
}

// On the page, palette black and white are theme greys that stay visible
// against the surface. On a background they mean dark and light ink, as in a
// terminal, so white on blue reads in both themes.
const INK_ON_BG = {
  0: "oklch(0.2 0.005 70)",
  7: "oklch(0.9 0.005 70)",
  8: "oklch(0.4 0.005 70)",
  15: "oklch(0.98 0.005 70)",
};

/**
 * The inline CSS for a style, or "" for the default style. Inverse swaps the
 * colours, with the output colour and the surface standing in for defaults.
 * A background fills the whole row height, as a terminal cell does, so
 * backgrounds on neighbouring rows touch.
 */
export function styleToCss(style) {
  if (isDefault(style)) return "";
  let fg = style.fg === null ? null : cssColor(style.fg);
  let bg = style.bg === null ? null : cssColor(style.bg);
  if (style.inverse) [fg, bg] = [bg ?? "var(--surface)", fg ?? "var(--out-value)"];
  else if (bg) fg = fg === null ? inkOn(bg) : (INK_ON_BG[style.fg] ?? fg);
  let css = "";
  if (fg) css += `color:${fg};`;
  if (bg) css += `background-color:${bg};display:inline-block;vertical-align:top;`;
  if (style.bold) css += "font-weight:bold;";
  if (style.dim) css += "opacity:0.6;";
  if (style.italic) css += "font-style:italic;";
  const lines = [style.underline && "underline", style.strike && "line-through"].filter(Boolean);
  if (lines.length) css += `text-decoration:${lines.join(" ")};`;
  return css;
}
