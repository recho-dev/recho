import {bool2hanzi, compile, num2hanzi, splitCells} from "wenyan";
import {ERROR_MARK, OUTPUT_MARK} from "../constant.js";
import {Inspector} from "../stdlib/inspect.js";

/**
 * wenyan-lang (文言), compiled cell by cell to JavaScript with Recho's fork of
 * its compiler (github:recho-dev/wenyan). See ./index.js.
 *
 * 示之 ("show it"), a keyword of the fork used like 書之, compiles to
 * `echo(…)`, and its values are written above the cell as wenyan comments:
 *
 *   批曰。「「➜ 三」」。
 *   夫「甲」。示之。
 *
 * 書之 is left alone: it prints to the console, as in any wenyan program.
 */

const OUTPUT_PREFIX = `批曰。「「${OUTPUT_MARK}`;

const ERROR_PREFIX = `批曰。「「${ERROR_MARK}`;

// Compiler temporaries: every cell numbers its own from 1, and they never
// leave the cell they are declared in.
const TEMPORARY = /^_(ans|rand)\d+$/;

/** Display a value like the wenyan IDE: numbers and booleans in hanzi. */
function hanzinize(value) {
  if (typeof value === "number") return num2hanzi(value);
  if (typeof value === "boolean") return bool2hanzi(value);
  if (Array.isArray(value)) return value.map(hanzinize).join("。");
  return value;
}

/**
 * Keep a line of output inside the comment's string: `」」` would end it, as
 * would a trailing `」` followed by the closing `」」`, and `「「` would open
 * a nested string.
 */
function escapeLine(line) {
  const escaped = line.replaceAll("「「", "「 「").replaceAll("」」", "」 」");
  return escaped.endsWith("」") ? escaped + " " : escaped;
}

const output = {
  outputPrefix: OUTPUT_PREFIX,
  errorPrefix: ERROR_PREFIX,
  formatLine: (prefix, line) => `${prefix} ${escapeLine(line)}」」。`,
  inspect: (value, options) =>
    value instanceof Error
      ? new Inspector(value, options)
      : new Inspector(hanzinize(value), {...options, quote: false}),
};

/** Replace Recho's own output lines with spaces, keeping every offset. */
function blankOutput(code) {
  return code
    .split("\n")
    .map((line) => (line.startsWith(OUTPUT_PREFIX) || line.startsWith(ERROR_PREFIX) ? " ".repeat(line.length) : line))
    .join("\n");
}

function assert(message, pos, ok) {
  if (!ok) throw Object.assign(new SyntaxError(message), {pos});
}

function toJavaScript(source) {
  try {
    return compile(source, {
      lang: "js",
      romanizeIdentifiers: "none",
      logCallback: () => {},
      errorCallback: (message) => {
        throw new SyntaxError(String(message));
      },
    });
  } catch (error) {
    // Report it from the cell, so the rest of the notebook still runs.
    return `throw new SyntaxError(${JSON.stringify(error.message)});`;
  }
}

export const wenyan = {
  id: "wenyan",
  output,
  cells(code) {
    const source = blankOutput(code);
    return splitCells(source, assert).map(({from, to}) => ({
      start: from,
      end: to,
      js: toJavaScript(source.slice(from, to)),
    }));
  },
  errorOffset(code, error) {
    const pos = Number.isInteger(error.pos) ? error.pos : 0;
    return code.lastIndexOf("\n", pos - 1) + 1;
  },
  isHiddenOutput: (name) => TEMPORARY.test(name),
};
