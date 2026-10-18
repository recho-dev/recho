// Only the standard library's loaders: the compiler itself runs in a worker
// (see ./mlscript.worker.js).
import {isStdModule, loadImports, loadModule} from "@mlscript/recho";
import {ERROR_PREFIX, JAVASCRIPT_OUTPUT, OUTPUT_PREFIX} from "../output.js";
import {Inspector} from "../stdlib/inspect.js";

/**
 * MLscript, compiled by the MLscript compiler's notebook session
 * (@mlscript/recho) into reactive nodes: one per top-level definition group,
 * with the names it reads and defines. See ./index.js.
 *
 * Output is written as in JavaScript (//➜ …), which MLscript reads as
 * comments, and values are shown the way MLscript prints them.
 *
 * The compiler runs in a worker, so that starting it and compiling don't
 * block the page; node bodies run here, like those of other languages.
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

/**
 * The compiler in a worker: `update(source)` returns a promise of what
 * createCompiler's `update` returns (see ./mlscript.compile.js).
 */
function workerCompiler() {
  const worker = new Worker(new URL("./mlscript.worker.js", import.meta.url), {type: "module"});
  const pending = new Map(); // id -> {resolve, reject}
  let nextId = 0;
  worker.onmessage = ({data: {id, result, error}}) => {
    const {resolve, reject} = pending.get(id);
    pending.delete(id);
    if (error) reject(Object.assign(error.name === "SyntaxError" ? new SyntaxError() : new Error(), error));
    else resolve(result);
  };
  worker.onerror = (event) => {
    event.preventDefault?.();
    const error = new Error(`The MLscript compiler failed: ${event.message ?? "it didn't load"}`);
    for (const {reject} of pending.values()) reject(error);
    pending.clear();
  };
  return {
    update(source) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, {resolve, reject});
        worker.postMessage({id, source});
      });
    },
    terminate: () => worker.terminate(),
  };
}

/** The compiler in this thread, where there are no workers (e.g. in tests). */
async function sameThreadCompiler() {
  // Ignored by webpack, so that the browser bundle doesn't include the
  // compiler twice; browsers have workers.
  const {createCompiler} = await import(/* webpackIgnore: true */ "./mlscript.compile.js");
  const compiler = createCompiler();
  return {update: async (source) => compiler.update(source)};
}

let loading = null;

/**
 * The MLscript language, once the compiler has started and the standard
 * library modules that every node needs are loaded.
 */
export function loadMLscript() {
  return (loading ??= load().catch((error) => {
    loading = null;
    throw error;
  }));
}

async function load() {
  const compiler = typeof Worker === "function" ? workerCompiler() : await sameThreadCompiler();
  try {
    return await createMLscript(compiler);
  } catch (error) {
    compiler.terminate?.();
    throw error;
  }
}

/**
 * The language, with `compiler` (whose `update(source)` returns a promise of
 * createCompiler's result) compiling the code.
 */
export async function createMLscript(compiler) {
  const host = createHost();
  // Load what the compiler always requires (its runtime, Predef), and use
  // its runtime to display values.
  const {requiredImports} = await compiler.update("");
  const {runtime} = await host.load(requiredImports);

  const output = {
    ...JAVASCRIPT_OUTPUT,
    inspect: (value, options) =>
      value instanceof Error || typeof value === "string"
        ? new Inspector(value, options)
        : new Inspector(runtime.render(value), {...options, quote: false}),
  };

  // The last compiled source and its result, so that when only the output
  // changed (Recho splits the code again then), the nodes are ready at once;
  // and the source being compiled, so that it's compiled only once.
  let last = {source: null, result: null};
  let compiling = {source: null, promise: null};

  function update(source) {
    if (source === last.source) return last.result;
    if (source === compiling.source) return compiling.promise;
    const promise = compiler.update(source).then(
      (result) => {
        last = {source, result};
        return result;
      },
      (error) => {
        // Compile it again if asked again (the compiler started over).
        if (compiling.promise === promise) compiling = {source: null, promise: null};
        throw error;
      },
    );
    compiling = {source, promise};
    return promise;
  }

  function nodesOf(code, toCode, {nodes, requiredImports, diagnostics}) {
    const error = diagnosticsError(diagnostics);
    if (error) throw error;
    return nodes.map((node) => ({
      key: node.key,
      // Output goes above a node's first line; a `let` node starts at
      // its name.
      start: lineStart(code, toCode(node.start)),
      end: toCode(node.end),
      // Recho provides `echo` and `recho` (its standard library; an output
      // that is a generator, e.g. `recho.interval(ms)`, takes each value it
      // yields, as in JavaScript); the host provides the imports.
      inputs: [...node.inputs, HOST],
      outputs: node.outputs,
      hiddenOutputs: node.hiddenOutputs,
      body: bodyOf(node, requiredImports),
      error: diagnosticsError(node.diagnostics),
    }));
  }

  return {
    id: "mlscript",
    output,
    // The nodes, at once if this source was compiled last (only the output
    // changed), and otherwise as a promise (see ./index.js).
    nodes(code) {
      const {source, toCode} = withoutOutput(code);
      const result = update(source);
      if (typeof result.then === "function") return result.then((result) => nodesOf(code, toCode, result));
      return nodesOf(code, toCode, result);
    },
    errorOffset(code, error) {
      return Number.isInteger(error.pos) ? lineStart(code, error.pos) : 0;
    },
    builtins: () => ({[HOST]: host}),
  };
}
