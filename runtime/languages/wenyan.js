import {bool2hanzi, compile, num2hanzi, splitCells, tokens2asc, wy2tokens} from "wenyan";
import {ERROR_MARK, OUTPUT_MARK} from "../constant.js";
import {parseModule} from "../parse.js";
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

const isPrimitive = (value) => ["number", "boolean", "string"].includes(typeof value);

/**
 * Display a value like the wenyan IDE: numbers and booleans in hanzi, and a
 * list of them joined with 。. Anything else (objects, empty or nested lists)
 * is left to the inspector, which the IDE would print as [object Object].
 */
function hanzinize(value) {
  if (typeof value === "number") return num2hanzi(value);
  if (typeof value === "boolean") return bool2hanzi(value);
  if (Array.isArray(value) && value.length && value.every(isPrimitive)) return value.map(hanzinize).join("。");
  return value;
}

/**
 * 『 and 』 open and close a nested string even inside 「「…」」, so an
 * unbalanced one would leave the comment open or end it early. Pairs are kept;
 * a lone 『 or 』 becomes 「 or 」.
 */
function balanceQuotes(line) {
  const chars = [...line];
  const open = [];
  chars.forEach((c, i) => {
    if (c === "『") open.push(i);
    else if (c === "』") {
      if (open.length) open.pop();
      else chars[i] = "」";
    }
  });
  for (const i of open) chars[i] = "「";
  return chars.join("");
}

/**
 * Keep a line of output inside the comment's string: `」」` would end it, as
 * would a trailing `」` followed by the closing `」」`, and `「「` would open
 * a nested string. Every bracket followed by another one gets a space, so
 * runs of any length are broken up.
 */
function escapeLine(line) {
  const escaped = balanceQuotes(line)
    .replace(/「(?=「)/g, "「 ")
    .replace(/」(?=」)/g, "」 ");
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

const isOutputAt = (code, i) => code.startsWith(OUTPUT_PREFIX, i) || code.startsWith(ERROR_PREFIX, i);

/**
 * Recho's output lines in `code`: their line numbers, each mapped to "output"
 * or "error". A line inside a
 * multi-line string can look like output, so string literals are followed
 * the way the compiler's tokenizer does: 「「 and 『 open a level, 」」 and 』
 * close one, whichever kind opened it.
 */
function outputLines(code) {
  const lines = new Map();
  let level = 0;
  let line = 0;
  let i = 0;
  while (i < code.length) {
    if (level === 0 && (i === 0 || code[i - 1] === "\n") && isOutputAt(code, i)) {
      lines.set(line, code.startsWith(ERROR_PREFIX, i) ? "error" : "output");
      const end = code.indexOf("\n", i);
      if (end === -1) break;
      i = end;
    }
    const c = code[i];
    if (c === "\n") {
      line++;
      i++;
    } else if (c === "『" || code.startsWith("「「", i)) {
      level++;
      i += c === "『" ? 1 : 2;
    } else if (level > 0 && c === "』") {
      level--;
      i++;
    } else if (level > 0 && c === "」" && code[i + 1] === "」" && (code[i + 2] !== "」" || code[i + 3] === "」")) {
      level--;
      i += 2;
    } else {
      i++;
    }
  }
  return lines;
}

/** Replace Recho's own output lines with spaces, keeping every offset. */
function blankOutput(code) {
  const outputs = outputLines(code);
  return code
    .split("\n")
    .map((line, i) => (outputs.has(i) ? " ".repeat(line.length) : line))
    .join("\n");
}

function assert(message, pos, ok) {
  if (!ok) throw Object.assign(new SyntaxError(message), {pos});
}

// Report an error from the cell itself, so the rest of the notebook runs.
const throwing = (message) => `throw new SyntaxError(${JSON.stringify(message)});`;

function toJavaScript(source) {
  let js;
  try {
    js = compile(source, {
      lang: "js",
      romanizeIdentifiers: "none",
      logCallback: () => {},
      errorCallback: (message) => {
        throw new SyntaxError(String(message));
      },
    });
  } catch (error) {
    return throwing(error.message);
  }
  // Names in 「」 become JavaScript names as they are, so one that isn't
  // valid in JavaScript (「甲-乙」, 「class」) compiles to code that doesn't
  // parse.
  let program;
  try {
    program = parseModule(js);
  } catch (error) {
    return throwing(`${error.message}: a name in 「」 isn't usable here. Names must also be valid JavaScript names.`);
  }
  // A cell of only comments (注曰, 疏曰, 批曰) isn't a cell, as comments
  // aren't in JavaScript. Anything else stays a cell, even if it compiles
  // to nothing.
  if (program.body.length) return js;
  const ops = tokens2asc(wy2tokens(source, assert), assert);
  return ops.length && ops.every((a) => a.op === "comment") ? null : js;
}

// toJavaScript is a pure function of the cell's source, and most cells don't
// change between runs, so its results are cached (and the cache dropped when
// large).
const compiled = new Map();

function toJavaScriptCached(source) {
  let js = compiled.get(source);
  if (js === undefined) {
    if (compiled.size > 2000) compiled.clear();
    compiled.set(source, (js = toJavaScript(source)));
  }
  return js;
}

export const wenyan = {
  id: "wenyan",
  output,
  cells(code) {
    const source = blankOutput(code);
    return splitCells(source, assert).flatMap(({from, to}) => {
      const js = toJavaScriptCached(source.slice(from, to));
      return js === null ? [] : [{start: from, end: to, js}];
    });
  },
  errorOffset(code, error) {
    const pos = Number.isInteger(error.pos) ? error.pos : 0;
    return code.lastIndexOf("\n", pos - 1) + 1;
  },
  isHiddenOutput: (name) => TEMPORARY.test(name),
  outputLines,
  // 刻漏, the classical water clock, is recho.interval: 施「刻漏」於一百。
  // 名之曰「刻」。 ticks 「刻」 every 100 ms.
  builtins: (stdlib) => ({刻漏: stdlib.interval}),
};
