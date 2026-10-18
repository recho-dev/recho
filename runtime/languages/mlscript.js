// Only the standard library's loaders: the compiler itself runs in a worker
// (see ./mlscript.worker.js).
import {isStdModule, loadImports, loadModule} from "@mlscript/recho";
import {ERROR_PREFIX, JAVASCRIPT_OUTPUT, OUTPUT_PREFIX} from "../output.js";
import {WARNING_LABEL} from "../constant.js";
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

/** The line (from 1) and column (from 0) of `offset` in `code`, as in JavaScript's syntax errors. */
function lineColumn(code, offset) {
  const start = lineStart(code, offset);
  let line = 1;
  for (let i = code.indexOf("\n"); i !== -1 && i < start; i = code.indexOf("\n", i + 1)) line++;
  return `${line}:${offset - start}`;
}

/** An error in the code that the parser found. */
export class ParseError extends Error {}
// On the prototype, so that the name isn't shown as a property of the error.
ParseError.prototype.name = "ParseError";

/** An error in the code that the compiler found after parsing (names, types). */
export class CompileError extends Error {}
CompileError.prototype.name = "CompileError";

/** The compiler failed, rather than the code: it crashed or stopped responding. */
export class CompilerFailure extends Error {}

const ERROR_KINDS = new Set(["error", "internal"]);

/** The width at which errors wrap. */
const ERROR_WIDTH = 100;

const INTERNAL_ERROR = "The MLscript compiler hit an internal error on this block.";

/**
 * Whether a diagnostic is a bug in the compiler rather than about the code.
 * Newer versions of the compiler add raw text to a diagnostic as `detail`
 * (for an internal error, the crash and its stack).
 */
const isInternal = (d) => d.kind === "internal";

/** The raw text of an internal diagnostic. */
const detailOf = (d) => (typeof d.detail === "string" ? d.detail : d.message);

/**
 * The text of a diagnostic: its message, then those of its other locations
 * (e.g. "Function 'f' expected 1 argument, but got 3"), each followed by its
 * `(line:column)` when it has a range. `where` maps an offset in the source
 * to that text.
 */
function describe(d, where) {
  if (isInternal(d)) return INTERNAL_ERROR;
  const locations = d.locations ?? [];
  const located = (message, range) => (range ? `${message} (${where(range.start)})` : message);
  const head = locations.find((l) => l.message === d.message && l.range);
  const lines = [located(d.message, head?.range)];
  for (const l of locations) {
    if (l === head || (l.message === d.message && !l.range)) continue;
    lines.push(located(l.message, l.range));
  }
  return lines.join("\n");
}

/**
 * An error for the error diagnostics of a node or of the document, or null if
 * there are none: a ParseError or a CompileError, after the first one's
 * source. Its `pos` is the first located offset (in `code`), and the raw text
 * of internal errors is its `detail`.
 */
function diagnosticsError(diagnostics, code, toCode) {
  const errors = diagnostics.filter((d) => ERROR_KINDS.has(d.kind));
  if (!errors.length) return null;
  const where = (offset) => lineColumn(code, toCode(offset));
  const message = [...new Set(errors.map((d) => describe(d, where)))].join("\n");
  const parsing = ["lexing", "parsing"].includes(errors[0].source) && !isInternal(errors[0]);
  const error = new (parsing ? ParseError : CompileError)(message);
  // Not enumerable, so that they aren't shown with the error.
  const range = errors.flatMap((d) => d.locations ?? []).find((l) => l.range)?.range;
  if (range) Object.defineProperty(error, "pos", {value: toCode(range.start), configurable: true});
  const details = errors.filter((d) => isInternal(d) || typeof d.detail === "string").map(detailOf);
  if (details.length) Object.defineProperty(error, "detail", {value: details.join("\n\n"), configurable: true});
  return error;
}

/** The warnings of a node, as text (see diagnosticsError). */
function warningsOf(diagnostics, code, toCode) {
  const where = (offset) => lineColumn(code, toCode(offset));
  const warnings = diagnostics.filter((d) => d.kind === "warning").map((d) => `${WARNING_LABEL} ${describe(d, where)}`);
  return [...new Set(warnings)];
}

/** Logs the raw text of the internal errors in a compile's result, for bug reports. */
function logInternalErrors({nodes, diagnostics}) {
  for (const d of [...diagnostics, ...nodes.flatMap((n) => n.diagnostics)]) {
    if (isInternal(d)) console.error(`MLscript compiler internal error: ${detailOf(d)}`);
  }
}

/** Standard-library paths ("std/Option.mls", "/std/Option.mjs") resolve to the bundled modules. */
function resolve(path) {
  if (isStdModule(path)) return loadModule(path);
  return import(/* @vite-ignore */ /* webpackIgnore: true */ path);
}

/**
 * A stand-in for a session-wide import that failed to load, for node bodies:
 * the node of its `import` shows the error (see importNodes), and using the
 * stand-in throws.
 */
function unavailable(path) {
  const fail = () => {
    throw new Error(`${path} didn't load (see the error at its import).`);
  };
  // `then` and symbols are looked up by code that only checks what a value is.
  const get = (target, key) => (key === "then" || typeof key === "symbol" ? undefined : fail());
  return new Proxy(function () {}, {get, apply: fail, construct: fail, has: fail, ownKeys: fail});
}

/**
 * Loads imports for node bodies. Each import is loaded once, so after the
 * first run a body only waits a microtask for them. `load(imports, lenient)`
 * rejects if one fails, except those at the indices in `lenient`, which are
 * then bound to a value that throws when used.
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
    async load(imports, lenient = []) {
      const results = await Promise.allSettled(imports.map(loadOne));
      const values = results.map(({status, value, reason}, i) => {
        if (status === "fulfilled") return value;
        if (lenient.includes(i)) return unavailable(imports[i].source.path);
        throw reason;
      });
      return Object.fromEntries(imports.map((imp, i) => [imp.name, values[i]]));
    },
  };
}

/**
 * For each session-wide import whose `import "path"` is found in `source`, a
 * node at that line that only loads it, so that if it fails to load, the
 * error shows there, once: the other nodes run without it (see `unavailable`).
 * Imports a node has of its own (`node.imports`) fail in that node.
 */
function importNodes(source, requiredImports) {
  const nodes = [];
  for (const imp of requiredImports) {
    if (imp.source.kind !== "module") continue;
    const statement = `import ${JSON.stringify(imp.source.path)}`;
    const at = source.indexOf(statement);
    if (at === -1) continue;
    nodes.push({
      key: `import ${imp.source.path}`,
      start: at,
      end: at + statement.length,
      inputs: [],
      outputs: [],
      hiddenOutputs: [],
      imports: [imp],
      body: "return {};",
      diagnostics: [],
    });
  }
  return nodes;
}

/**
 * The body Recho runs: the compiler's, after binding the session's required
 * imports and the node's own imports. The session-wide imports at the
 * indices in `lenient` don't stop the node if they fail to load.
 */
function bodyOf(node, requiredImports, lenient) {
  const imports = [...requiredImports, ...node.imports];
  if (!imports.length) return node.body;
  const names = imports.map((i) => i.name).join(", ");
  const args = [JSON.stringify(imports), ...(lenient.length ? [JSON.stringify(lenient)] : [])].join(", ");
  return `const {${names}} = await ${HOST}.load(${args});\n{\n${node.body}\n}`;
}

/** How long a compile may take before the compiler is deemed stuck and restarted. */
export const COMPILE_TIMEOUT = 20_000;

const STOPPED_RESPONDING = "The MLscript compiler stopped responding; it has been restarted.";

const ERROR_TYPES = {Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError};

/** An error posted by the worker (`{name, message}`), as an Error whose name isn't shown as a property. */
function rebuildError({name = "Error", message = ""}) {
  const error = new (ERROR_TYPES[name] ?? Error)(message);
  if (error.name !== name) Object.defineProperty(error, "name", {value: name, configurable: true, writable: true});
  return error;
}

/**
 * The compiler in a worker: `update(source)` returns a promise of what
 * createCompiler's `update` returns (see ./mlscript.compile.js). `restart()`
 * replaces a stuck worker, rejecting its pending compiles.
 */
export function workerCompiler() {
  const pending = new Map(); // id -> {resolve, reject}
  let nextId = 0;
  let worker;
  const fail = (error) => {
    for (const {reject} of pending.values()) reject(error);
    pending.clear();
  };
  function spawn() {
    worker = new Worker(new URL("./mlscript.worker.js", import.meta.url), {type: "module"});
    worker.onmessage = ({data: {id, result, error}}) => {
      const request = pending.get(id);
      if (!request) return;
      pending.delete(id);
      if (error) request.reject(rebuildError(error));
      else request.resolve(result);
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      fail(new CompilerFailure(`The MLscript compiler failed: ${event.message ?? "it didn't load"}.`));
    };
  }
  spawn();
  return {
    update(source) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, {resolve, reject});
        worker.postMessage({id, source});
      });
    },
    restart() {
      worker.terminate();
      fail(new CompilerFailure(STOPPED_RESPONDING));
      spawn();
    },
    terminate: () => worker.terminate(),
  };
}

/** The error of a compile request that a newer one replaced before it started. */
export class OutdatedCompile extends Error {
  name = "OutdatedCompile";
}

/**
 * `compiler`, compiling one source at a time and, of the requests waiting for
 * the current compile, only the latest: an earlier one is rejected with
 * OutdatedCompile without being compiled. Recho only uses the latest run's
 * result (see ./index.js), so nothing waits for it.
 *
 * A compile that takes longer than `timeout` ms (the worker died without an
 * error, or the compiler loops) is rejected with a CompilerFailure and the
 * compiler restarted (`compiler.restart()`), so that the waiting request and
 * later ones are compiled.
 */
export function latestOnly(compiler, {timeout = Infinity} = {}) {
  let busy = false;
  let waiting = null; // {source, resolve, reject}
  function start(source) {
    busy = true;
    let timer;
    const stuck = new Promise((resolve, reject) => {
      if (timeout === Infinity) return;
      timer = setTimeout(() => {
        reject(new CompilerFailure(STOPPED_RESPONDING));
        compiler.restart?.();
      }, timeout);
    });
    return Promise.race([compiler.update(source), stuck]).finally(() => {
      clearTimeout(timer);
      busy = false;
      if (!waiting) return;
      const {source, resolve, reject} = waiting;
      waiting = null;
      start(source).then(resolve, reject);
    });
  }
  return {
    ...compiler,
    update(source) {
      if (!busy) return start(source);
      waiting?.reject(new OutdatedCompile("A newer version of the code is compiled instead."));
      return new Promise((resolve, reject) => {
        waiting = {source, resolve, reject};
      });
    },
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
  const compiler = latestOnly(typeof Worker === "function" ? workerCompiler() : await sameThreadCompiler(), {
    timeout: COMPILE_TIMEOUT,
  });
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
    inspect(value, options) {
      // Compiler messages are long: errors wrap at a narrower width than JavaScript's.
      if (value instanceof Error) return new Inspector(value, {limit: ERROR_WIDTH, ...options});
      if (typeof value === "string") return new Inspector(value, options);
      let rendered;
      try {
        rendered = runtime.render(value);
      } catch (error) {
        // E.g. a proxy whose traps throw: show it the way JavaScript would.
        console.error(error);
        return new Inspector(value, options);
      }
      return new Inspector(rendered, {...options, quote: false});
    },
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
        logInternalErrors(result);
        return result;
      },
      (error) => {
        // Compile it again if asked again (the compiler started over).
        if (compiling.promise === promise) compiling = {source: null, promise: null};
        if (error instanceof OutdatedCompile || error instanceof CompilerFailure) throw error;
        // The compiler threw rather than report a diagnostic.
        console.error(error);
        throw new CompilerFailure(`The MLscript compiler crashed: ${error?.message ?? error}`);
      },
    );
    compiling = {source, promise};
    return promise;
  }

  function nodesOf(code, toCode, source, {nodes, requiredImports, diagnostics}) {
    // Diagnostics of the whole document mean the session couldn't be set up
    // (e.g. the standard library didn't load): a failure of the compiler.
    const failed = diagnosticsError(diagnostics, code, toCode);
    if (failed) {
      const error = new CompilerFailure(`The MLscript compiler couldn't start: ${failed.message}`);
      if (Number.isInteger(failed.pos)) Object.defineProperty(error, "pos", {value: failed.pos, configurable: true});
      throw error;
    }
    const imports = importNodes(source, requiredImports);
    // The imports that their own node loads (and reports) don't stop the others.
    const lenient = requiredImports.flatMap((imp, i) => (imports.some((n) => n.imports[0] === imp) ? [i] : []));
    const all = [...nodes.map((node) => ({node, requiredImports, lenient})), ...imports.map((node) => ({node}))];
    all.sort((a, b) => a.node.start - b.node.start);
    return all.map(({node, requiredImports = [], lenient = []}) => ({
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
      body: bodyOf(node, requiredImports, lenient),
      error: diagnosticsError(node.diagnostics, code, toCode),
      warnings: warningsOf(node.diagnostics, code, toCode),
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
      if (typeof result.then === "function") return result.then((result) => nodesOf(code, toCode, source, result));
      return nodesOf(code, toCode, source, result);
    },
    errorOffset(code, error) {
      return Number.isInteger(error.pos) ? lineStart(code, error.pos) : 0;
    },
    builtins: () => ({[HOST]: host}),
  };
}
