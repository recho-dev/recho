import {createReplSession, isStdModule, loadImports, loadModule} from "@mlscript/recho";
import {ERROR_PREFIX, JAVASCRIPT_OUTPUT, OUTPUT_PREFIX} from "../output.js";
import {Inspector} from "../stdlib/inspect.js";

/**
 * MLscript, compiled by the MLscript compiler's notebook session
 * (@mlscript/recho) into reactive nodes: one per top-level definition group,
 * with the names it reads and defines. See ./index.js.
 *
 * Output is written as in JavaScript (//➜ …), which MLscript reads as
 * comments, and values are shown the way MLscript prints them.
 */

// The name of the builtin through which node bodies get the values the
// compiler expects in scope (its runtime, Predef, imported modules).
const HOST = "__mlscript__";

/** Recho's output lines (//➜, //✗) at the start of a line. */
const isOutputLine = (line) => line.startsWith(OUTPUT_PREFIX) || line.startsWith(ERROR_PREFIX);

/**
 * `code` without Recho's output lines, so that writing output never looks
 * like an edit to the compiler (which would compile the blocks below again),
 * and a function mapping an offset in it back to an offset in `code`. An
 * offset where output lines were removed maps to after them.
 */
function withoutOutput(code) {
  const removed = []; // {at, length}: `length` characters removed at `at` (in the result).
  let source = "";
  let start = 0;
  while (start <= code.length) {
    const newline = code.indexOf("\n", start);
    const end = newline === -1 ? code.length : newline + 1;
    const line = code.slice(start, end);
    if (isOutputLine(line)) removed.push({at: source.length, length: line.length});
    else source += line;
    if (newline === -1) break;
    start = end;
  }
  const toCode = (offset) => {
    let result = offset;
    for (const {at, length} of removed) {
      if (at > offset) break;
      result += length;
    }
    return result;
  };
  return {source, toCode};
}

const lineStart = (code, offset) => code.lastIndexOf("\n", offset - 1) + 1;

const ERROR_KINDS = new Set(["error", "internal"]);

/** An error for the error diagnostics of a node, or null if it has none. */
function diagnosticsError(diagnostics) {
  const messages = diagnostics.filter((d) => ERROR_KINDS.has(d.kind)).map((d) => d.message);
  if (!messages.length) return null;
  return new SyntaxError([...new Set(messages)].join("\n"));
}

/** Standard-library paths ("std/Option.mls", "/std/Option.mjs") resolve to the bundled modules. */
function resolve(path) {
  if (isStdModule(path)) return loadModule(path);
  return import(/* @vite-ignore */ /* webpackIgnore: true */ path);
}

/**
 * Loads imports for node bodies. Each import is loaded once, so after the
 * first run a body only waits a microtask for them.
 */
function createHost() {
  const cache = new Map();
  const loadOne = (imp) => {
    const id = JSON.stringify(imp.source);
    if (!cache.has(id)) {
      const promise = loadImports([{name: "value", source: imp.source}], {resolve}).then((v) => v.value);
      // Don't cache a failure (e.g. a URL that was offline).
      promise.catch(() => cache.delete(id));
      cache.set(id, promise);
    }
    return cache.get(id);
  };
  return {
    async load(imports) {
      const values = await Promise.all(imports.map(loadOne));
      return Object.fromEntries(imports.map((imp, i) => [imp.name, values[i]]));
    },
  };
}

/**
 * The body Recho runs: the compiler's, after binding the session's required
 * imports and the node's own imports.
 */
function bodyOf(node, requiredImports) {
  const imports = [...requiredImports, ...node.imports];
  if (!imports.length) return node.body;
  const names = imports.map((i) => i.name).join(", ");
  return `const {${names}} = await ${HOST}.load(${JSON.stringify(imports)});\n{\n${node.body}\n}`;
}

let loading = null;

/**
 * The MLscript language, once the standard library modules that every node
 * needs are loaded.
 */
export function loadMLscript() {
  return (loading ??= load().catch((error) => {
    loading = null;
    throw error;
  }));
}

async function load() {
  const host = createHost();
  let session = createReplSession();
  // Load what the compiler always requires (its runtime, Predef), and use
  // its runtime to display values.
  const {requiredImports} = session.update("");
  const {runtime} = await host.load(requiredImports);

  const output = {
    ...JAVASCRIPT_OUTPUT,
    inspect: (value, options) =>
      value instanceof Error || typeof value === "string"
        ? new Inspector(value, options)
        : new Inspector(runtime.render(value), {...options, quote: false}),
  };

  // The last compiled source and its result: Recho splits the code again
  // when only its output changed.
  let last = {source: null, result: null};

  function update(source) {
    if (source === last.source) return last.result;
    let result;
    try {
      result = session.update(source);
    } catch (error) {
      // The session may be left inconsistent; start a new one.
      session = createReplSession();
      last = {source: null, result: null};
      throw error;
    }
    last = {source, result};
    return result;
  }

  return {
    id: "mlscript",
    output,
    nodes(code) {
      const {source, toCode} = withoutOutput(code);
      const {nodes, requiredImports, diagnostics} = update(source);
      const error = diagnosticsError(diagnostics);
      if (error) throw error;
      return nodes.map((node) => ({
        key: node.key,
        // Output goes above a node's first line; a `let` node starts at
        // its name.
        start: lineStart(code, toCode(node.start)),
        end: toCode(node.end),
        // Recho provides `echo`; the host provides the imports.
        inputs: [...node.inputs, HOST],
        outputs: node.outputs,
        hiddenOutputs: node.hiddenOutputs,
        body: bodyOf(node, requiredImports),
        error: diagnosticsError(node.diagnostics),
      }));
    },
    errorOffset(code, error) {
      return Number.isInteger(error.pos) ? lineStart(code, error.pos) : 0;
    },
    builtins: () => ({[HOST]: host}),
  };
}
