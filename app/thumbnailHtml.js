import {load} from "cheerio";
import {OUTPUT_MARK, ERROR_MARK} from "../runtime/constant.js";
import {hasEscape, parse, styleToCss} from "../lib/ansi.js";
import {PREFIX_END} from "../lib/blocks/detect.ts";

// Output lines in JavaScript and MLscript (//➜) and wenyan (批曰。「「➜) notebooks.
const OUTPUT = [`//${OUTPUT_MARK}`, `批曰。「「${OUTPUT_MARK}`];
const ERROR = `//${ERROR_MARK}`;

function removeEmptyLines(string) {
  const [first, ...rest] = string.split("\n").filter((line) => line.trim() !== "");
  // If the first line ends with <code>, the code is already in the first line.
  if (first.endsWith("<code>")) return first + rest.join("\n");
  return first + "\n" + rest.join("\n");
}

/**
 * Draws an output line with SGR codes like the editor does: the prefix, then
 * one span per style. Styled spans are marked `ansi`, so the quiet output
 * colour doesn't cover them.
 */
function colorOutput($, line) {
  const text = $(line).text();
  if (!hasEscape(text)) return;
  const prefix = text.match(PREFIX_END)?.[0] ?? "";
  $(line).empty();
  if (prefix) $(line).append($("<span>").text(prefix));
  for (const run of parse(text.slice(prefix.length))) {
    const span = $("<span>").text(run.text);
    const css = styleToCss(run.style);
    if (css) span.addClass("ansi").attr("style", css);
    $(line).append(span);
  }
}

/**
 * Marks the output lines of Shiki's HTML like the editor does: `out` (and
 * `err` for errors) on each, `first` and `last` at the ends of a run, so the
 * run gets one continuous marker.
 */
function markOutput($, lines) {
  const type = (line) => {
    const text = $(line).text();
    if (text.startsWith(ERROR)) return "err";
    return OUTPUT.some((prefix) => text.startsWith(prefix)) ? "out" : null;
  };
  for (let i = 0; i < lines.length; ) {
    if (!type(lines[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && type(lines[j])) j++;
    for (let k = i; k < j; k++) {
      const line = $(lines[k]);
      line.addClass("out");
      colorOutput($, lines[k]);
      if (type(lines[k]) === "err") line.addClass("err");
      if (k === i) line.addClass("first");
      if (k === j - 1) line.addClass("last");
    }
    i = j;
  }
}

/** Drops the first `skip` characters of a line, across its text nodes. */
function cropColumn(line, skip) {
  const texts = [];
  const walk = (node) => {
    for (const child of node.children ?? []) {
      if (child.type === "text") texts.push(child);
      else walk(child);
    }
  };
  walk(line);
  let left = skip;
  for (const node of texts) {
    if (left <= 0) break;
    const text = node.data ?? "";
    if (text.length <= left) {
      left -= text.length;
      node.data = "";
    } else {
      node.data = text.slice(left);
      left = 0;
    }
  }
}

/**
 * The part of Shiki's HTML that a thumbnail shows: the lines from
 * `outputStartLine` on, at most `maxLines` of them when given, with their
 * output lines marked. `outputStartColumn` (1-based) drops the columns before
 * it, counted on the source line, so a drawing can start in frame.
 */
export function thumbnailHtml(html, outputStartLine = null, maxLines = Infinity, outputStartColumn = null) {
  const $ = load(html, null, false);
  const lines = $("span.line").toArray();
  const start = outputStartLine === null ? 0 : outputStartLine - 1;
  const shown = [];
  for (let i = 0; i < lines.length; i++) {
    if (i < start || i >= start + maxLines) $(lines[i]).remove();
    else shown.push(lines[i]);
  }
  markOutput($, shown);
  const column = Number(outputStartColumn);
  if (Number.isInteger(column) && column > 1) {
    for (const line of shown) cropColumn(line, column - 1);
  }
  return removeEmptyLines($.html());
}
