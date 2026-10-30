import {lexer} from "marked";
import {DEFAULT_STYLE, serialize} from "../../lib/ansi.js";
import {Inspector, inspect} from "./inspect.js";

// Markdown as coloured text: `recho.md` parses Markdown with marked's lexer
// and renders it as ANSI-styled lines, which echo shows in colour (see
// lib/ansi.js). Colours are palette indices, so they follow the theme.
//
// Text is built as runs, {text, style}, rather than as strings with escapes,
// so nested styles (a link inside bold text) never cancel each other, and
// paragraphs can be wrapped by the characters they show.

/** Paragraphs wrap at this many characters. */
const WIDTH = 80;

const RED = 1;
const GREEN = 2;
const YELLOW = 3;
const BLUE = 4;
const MAGENTA = 5;
const CYAN = 6;

// Code blocks: a dark panel, the same in both themes, as in a terminal.
const PANEL = {bg: "#24292f", fg: "#e6edf3"};
const PANEL_LABEL = "#8b949e";
const SYNTAX = {keyword: "#ff7b72", string: "#a5d6ff", number: "#79c0ff", comment: "#8b949e"};
const HIGHLIGHTED = new Set(["js", "javascript", "jsx", "ts", "typescript", "tsx", "mjs"]);

const ENTITIES = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " "};

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return ENTITIES[name.toLowerCase()] ?? entity;
  });
}

const run = (text, style = DEFAULT_STYLE) => ({text, style});

const styled = (style, extra) => ({...style, ...extra});

const length = (runs) => runs.reduce((n, r) => n + r.text.length, 0);

/** Inline tokens as runs, starting from `style`. */
function inline(tokens = [], style = DEFAULT_STYLE) {
  return tokens.flatMap((token) => {
    switch (token.type) {
      case "strong":
        return inline(token.tokens, styled(style, {bold: true}));
      case "em":
        return inline(token.tokens, styled(style, {italic: true}));
      case "del":
        return inline(token.tokens, styled(style, {strike: true}));
      case "codespan":
        return [run(decode(token.text), styled(style, {fg: RED}))];
      case "link": {
        const label = inline(token.tokens, styled(style, {fg: BLUE, underline: true}));
        // Autolinks show their address already.
        if (token.text === token.href || `mailto:${token.text}` === token.href) return label;
        return [...label, run(` ${token.href}`, styled(style, {dim: true}))];
      }
      case "image":
        return [run(`[image: ${decode(token.text) || token.href}]`, styled(style, {dim: true}))];
      case "br":
        return [run("\n", style)];
      case "html":
        return [run(token.text, styled(style, {dim: true}))];
      case "checkbox":
        return [];
      default:
        if (token.tokens) return inline(token.tokens, style);
        return [run(decode(token.text ?? token.raw ?? ""), style)];
    }
  });
}

/**
 * Runs as lines of at most `width` characters, broken at spaces. A soft line
 * break joins the lines around it, as in Markdown; a hard one (`br`) stays.
 */
function wrap(runs, width) {
  const lines = [[]];
  let used = 0;
  const line = () => lines[lines.length - 1];
  const push = (text, style) => {
    const last = line()[line().length - 1];
    if (last && last.style === style) last.text += text;
    else line().push(run(text, style));
    used += text.length;
  };
  for (const {text, style} of runs) {
    if (text === "\n") {
      lines.push([]);
      used = 0;
      continue;
    }
    for (const piece of text.replace(/\n/g, " ").split(/( +)/)) {
      if (!piece) continue;
      if (piece[0] === " ") {
        if (used > 0) push(" ", style);
        continue;
      }
      if (used > 0 && used + piece.length > width) {
        // The space before the break isn't shown.
        const runs = line();
        const last = runs[runs.length - 1];
        if (last.text.endsWith(" ")) last.text = last.text.slice(0, -1);
        if (!last.text) runs.pop();
        lines.push([]);
        used = 0;
      }
      push(piece, style);
    }
  }
  return lines;
}

/** `lines` with `first` before the first line and `rest` before the others. */
function prefix(lines, first, rest) {
  return lines.map((line, i) => [...(i === 0 ? first : rest), ...line]);
}

function highlight(text) {
  const runs = [];
  const pattern = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/g;
  const keywords =
    /^(const|let|var|function|return|if|else|for|of|in|new|while|do|class|extends|import|export|from|async|await|yield|true|false|null|undefined|this|typeof|instanceof|try|catch|finally|throw|switch|case|break|continue|default)$/;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const [token, comment, string, number, word] = match;
    const color = comment
      ? SYNTAX.comment
      : string
        ? SYNTAX.string
        : number
          ? SYNTAX.number
          : word && keywords.test(word)
            ? SYNTAX.keyword
            : null;
    if (!color) continue;
    if (match.index > index) runs.push(run(text.slice(index, match.index), styled(DEFAULT_STYLE, PANEL)));
    runs.push(run(token, styled(DEFAULT_STYLE, {...PANEL, fg: color})));
    index = match.index + token.length;
  }
  if (index < text.length) runs.push(run(text.slice(index), styled(DEFAULT_STYLE, PANEL)));
  return runs;
}

function codeBlock(token) {
  const lines = token.text.split("\n");
  const language = token.lang?.split(/\s/)[0] ?? "";
  const width = Math.max(language.length, ...lines.map((line) => line.length)) + 4;
  const panel = styled(DEFAULT_STYLE, PANEL);
  const color = HIGHLIGHTED.has(language);
  const top = [run(language.padStart(width - 1) + " ", styled(panel, {fg: PANEL_LABEL}))];
  const rows = lines.map((line) => {
    const padded = line.padEnd(width - 2);
    return [run("  ", panel), ...(color ? highlight(padded) : [run(padded, panel)])];
  });
  return [top, ...rows, [run(" ".repeat(width), panel)]];
}

// Tables are drawn with | and -, as Markdown writes them. Box-drawing
// characters would make the editor show the whole output as ASCII art, with
// rows packed tight, prose included.
function table(token) {
  const dim = styled(DEFAULT_STYLE, {dim: true});
  const header = token.header.map((cell) => inline(cell.tokens, styled(DEFAULT_STYLE, {bold: true})));
  const rows = token.rows.map((row) => row.map((cell) => inline(cell.tokens)));
  const widths = header.map((_, j) => Math.max(length(header[j]), ...rows.map((row) => length(row[j] ?? []))));
  const line = (cells) => {
    const out = [run("|", dim)];
    widths.forEach((w, j) => {
      const cell = (cells[j] ?? []).filter((r) => r.text !== "\n");
      const space = w - length(cell);
      const left = token.align[j] === "right" ? space : token.align[j] === "center" ? Math.floor(space / 2) : 0;
      out.push(run(" ".repeat(left + 1)), ...cell, run(" ".repeat(space - left + 1)), run("|", dim));
    });
    return out;
  };
  const rule = [run("|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|", dim)];
  return [line(header), rule, ...rows.map(line)];
}

function list(token, width) {
  const start = Number(token.start) || 1;
  const markers = token.items.map((item, i) => {
    const marker = token.ordered ? `${start + i}.` : "•";
    return item.task ? `${marker} [${item.checked ? "x" : " "}]` : marker;
  });
  const indent = Math.max(...markers.map((m) => m.length)) + 1;
  const lines = [];
  token.items.forEach((item, i) => {
    const body = blocks(item.tokens, width - indent, item.loose);
    const marker = run(markers[i].padEnd(indent), styled(DEFAULT_STYLE, {fg: YELLOW}));
    lines.push(...prefix(body.length ? body : [[]], [marker], [run(" ".repeat(indent))]));
    if (item.loose && i < token.items.length - 1) lines.push([]);
  });
  return lines;
}

function heading(token, width) {
  const color = token.depth === 1 ? MAGENTA : token.depth === 2 ? CYAN : null;
  const runs = inline(token.tokens, styled(DEFAULT_STYLE, {bold: true, fg: color}));
  const lines = wrap(runs, width);
  if (token.depth > 2) return lines;
  const rule = token.depth === 1 ? "=" : "-";
  const longest = Math.max(...lines.map(length));
  return [...lines, [run(rule.repeat(longest), styled(DEFAULT_STYLE, {fg: color}))]];
}

/** One block token as lines of runs. */
function block(token, width) {
  switch (token.type) {
    case "heading":
      return heading(token, width);
    case "paragraph":
      return wrap(inline(token.tokens), width);
    case "text":
      return wrap(token.tokens ? inline(token.tokens) : [run(decode(token.text))], width);
    case "list":
      return list(token, width);
    case "blockquote": {
      const bar = run(" ", styled(DEFAULT_STYLE, {bg: GREEN}));
      const body = blocks(token.tokens, width - 2).map((line) =>
        line.map((r) => run(r.text, styled(r.style, {italic: true}))),
      );
      return prefix(body, [bar, run(" ")], [bar, run(" ")]);
    }
    case "code":
      return codeBlock(token);
    case "table":
      return table(token);
    case "hr":
      return [[run("-".repeat(Math.min(width, 40)), styled(DEFAULT_STYLE, {dim: true}))]];
    case "html":
      return token.text
        .replace(/\n+$/, "")
        .split("\n")
        .map((line) => [run(line, styled(DEFAULT_STYLE, {dim: true}))]);
    case "space":
    case "def":
    case "checkbox":
      return null;
    default:
      return token.tokens ? wrap(inline(token.tokens), width) : [[run(token.raw ?? "")]];
  }
}

/** Block tokens as lines, with a blank line between blocks unless `tight`. */
function blocks(tokens, width, loose = true) {
  const lines = [];
  for (const token of tokens) {
    const rendered = block(token, Math.max(width, 20));
    if (!rendered) continue;
    // Inside a tight list item, its text and a nested list sit together.
    if (lines.length && loose) lines.push([]);
    lines.push(...rendered);
  }
  return lines;
}

/** `strings` without the indentation their lines share, and without blank first and last lines. */
function dedent(strings) {
  const indents = strings
    .join("\0")
    .split("\n")
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => line.match(/^[ \t]*/)[0].length);
  const indent = indents.length ? Math.min(...indents) : 0;
  const parts = strings.map((string) => string.replace(new RegExp(`\\n[ \\t]{0,${indent}}`, "g"), "\n"));
  parts[0] = parts[0].replace(/^[ \t]*\n/, "");
  parts[parts.length - 1] = parts[parts.length - 1].replace(/\n[ \t]*$/, "");
  return parts;
}

/** An interpolated value as Markdown: a string as is, other values as echo would show them. */
function source(value) {
  if (value instanceof Markdown) return value.source;
  if (typeof value === "string") return value;
  return inspect(value).format();
}

/** Markdown rendered as coloured text. echo shows it as is; `String(md)` is the text with its colours. */
export class Markdown extends Inspector {
  constructor(source) {
    const lines = blocks(lexer(source), WIDTH);
    super(lines.map(serialize).join("\n"), {quote: false});
    this.source = source;
  }
  toString() {
    return this.value;
  }
}

/**
 * Markdown as coloured text, written as a tagged template:
 *
 * ```js
 * echo(recho.md`# Hello ${name}`);
 * ```
 *
 * Also takes a plain string: `recho.md(text)`.
 */
export function md(strings, ...values) {
  if (typeof strings === "string") return new Markdown(strings);
  const parts = dedent(strings);
  let text = parts[0];
  values.forEach((value, i) => (text += source(value) + parts[i + 1]));
  return new Markdown(text);
}
