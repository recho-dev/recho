import objectInspector from "object-inspect";
import {hasEscape, hasSGR, normalize, stripAnsi, truncate} from "../../lib/ansi.js";

function isMultiline(value) {
  const isString = typeof value === "string";
  if (!isString) return false;
  const lines = value.split("\n");
  return lines.length > 1;
}

/** `string` with lines longer than `width` broken at spaces (or anywhere, if a word is longer). */
function wrap(string, width) {
  return string
    .split("\n")
    .flatMap((line) => {
      const lines = [];
      while (line.length > width) {
        const space = line.lastIndexOf(" ", width);
        const cut = space > 0 ? space : width;
        lines.push(line.slice(0, cut).trimEnd());
        line = line.slice(cut).trimStart();
      }
      lines.push(line);
      return lines;
    })
    .join("\n");
}

/** A string shown as is: only its SGR sequences kept (see lib/ansi.js). */
function raw(string) {
  return hasEscape(string) ? normalize(string) : string;
}

function inspector(value, {limit = 200, quote = "double", indent = null} = {}) {
  if (isMultiline(value)) return raw(value);
  if (typeof value === "string" && !quote) return raw(value);
  // A string with colours is shown as is, like a multi-line string, so its
  // colours show; it is cut short by the characters it shows.
  if (typeof value === "string" && hasSGR(value)) return truncate(raw(value), limit);
  if (!quote) quote = "double";
  const string = objectInspector(value, {indent, quoteStyle: quote});
  // An error isn't cut short, but wrapped: its message is all the user has.
  // Its colours are dropped, so no escape (or half of one) reaches the code.
  if (value instanceof Error) return wrap(stripAnsi(string), limit);
  if (string.length > limit) return string.slice(0, limit) + "…";
  return string;
}

export class Inspector {
  constructor(value, options = {}) {
    this.value = value;
    this.options = options;
  }
  format() {
    return inspector(this.value, this.options);
  }
}

export function inspect(value, options) {
  return new Inspector(value, options);
}
