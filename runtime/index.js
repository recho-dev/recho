import {transpileJavaScript} from "@observablehq/notebook-kit";
import {Runtime} from "@observablehq/runtime";
import {group} from "d3-array";
import {dispatch as d3Dispatch} from "d3-dispatch";
import * as stdlib from "./stdlib/index.js";
import {BlockMetadata} from "../editor/blocks/BlockMetadata.ts";
import {blockMetadataEffect} from "../editor/blocks/effect.ts";
import {IntervalTree} from "../lib/IntervalTree.ts";
import {rewriteMutables, transpileRechoJavaScript} from "./transpile.js";
import {analyzeMutables, createMutator} from "./mutable.js";
import {ButtonRegistry, makeButton} from "./controls/button.js";
import {addPrefix, makeOutput} from "./output.js";
import {javascript} from "./languages/javascript.js";

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Compile a cell wrapper source (a parenthesized function expression) into a
// callable. This module is shared between the browser editor bundle and the
// Node TUI worker, so it must stay free of node: imports; the worker injects
// a vm-backed compiler (see ./vmEval.js) via createRuntime's `compileCell`
// option to get timeout-armed execution.
function defaultCompileCell(source) {
  return new Function(`return ${source};`)();
}

// Compile `code` (a function expression) into a callable that the Observable
// runtime can invoke with input values. The wrapper routes echo calls made
// while it runs to the cell's own echo (see `__setEcho__`).
function compileWrapper(code, inputs, __setEcho__, compileCell) {
  const argList = ["__setEcho__", ...inputs].join(",");
  const resultVar = `__recho_v_${uid()}`;
  const body = `(function(${argList}){
      __setEcho__(echo);
      const __foo__ = ${code};
      const ${resultVar} = __foo__(${inputs.join(",")});
      __setEcho__(null);
      return ${resultVar};
    })`;
  const fn = compileCell(body);
  return (...args) => fn(__setEcho__, ...args);
}

// Compile `code` (a Recho-transpiled cell expression) into a callable that
// the Observable runtime can invoke with input values.
function safeEval(code, inputs, __setEcho__, compileCell) {
  try {
    return compileWrapper(code, inputs, __setEcho__, compileCell);
  } catch (error) {
    // Wrap non-function statements in an arrow function for proper evaluation.
    // Example:
    // Input: `for (let i = 0; i < 10; i++) { echo(i); }`
    // Output: `() => { for (let i = 0; i < 10; i++) { echo(i); } }`
    const wrapped = `() => {${code}}`;
    return compileWrapper(wrapped, inputs, __setEcho__, compileCell);
  }
}

// Narrow a change spec to the part that actually differs from the old text:
// drop the common prefix and suffix of the replaced range and its
// replacement. Returns null when they are identical (no edit needed).
// Exported for tests.
export function trimChange(oldText, change) {
  const from = change.from;
  const to = change.to ?? change.from;
  const insert = change.insert ?? "";
  const old = oldText.slice(from, to);
  if (old === insert) return null;
  const max = Math.min(old.length, insert.length);
  let p = 0;
  while (p < max && old[p] === insert[p]) p++;
  let s = 0;
  while (s < max - p && old[old.length - 1 - s] === insert[insert.length - 1 - s]) s++;
  if (p === 0 && s === 0) return change;
  return {from: from + p, to: to - s, insert: insert.slice(p, insert.length - s)};
}

// Where `pos` moves to with `changes` (specs of the same document, as
// dispatched), or null when they replace it. An insertion at `pos` goes
// before it, as output goes above its cell. Exported for tests.
export function mapPos(changes, pos) {
  let delta = 0;
  for (const {from, to = from, insert = ""} of changes) {
    if (to <= pos) delta += insert.length - (to - from);
    else if (from < pos) return null;
  }
  return pos + delta;
}

// How long a language's `nodes` may take before the editor says it's compiling.
const COMPILING_DELAY = 1000;

function debounce(fn, delay = 0) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function createRuntime(initialCode, options = {}) {
  let code = initialCode;
  let prevCode = null;
  let isRunning = false;
  const compileCell = options.compileCell ?? defaultCompileCell;
  const language = options.language ?? javascript;
  const {output: outputFormat} = language;
  let disposed = false;

  // Create button registry for this runtime instance
  const buttonRegistry = new ButtonRegistry();

  // Echo context management system for proper output routing.
  // Execution flow:
  // 1. Before execution: __setEcho__(echo) stores the current cell's echo function
  // 2. During execution: __getEcho__() retrieves the stored echo function
  // 3. After execution: __setEcho__(null) restores the original echo context
  // This ensures nested function calls output to the executing cell rather than
  // the cell where the function was originally defined.
  let __echo__ = null;
  const __getEcho__ = () => __echo__;
  const __setEcho__ = (echo) => (__echo__ = echo);

  // The promoted `let` names the cell running synchronously right now depends
  // on, directly or through other cells. A mutator throws when such a cell
  // assigns one of them, since that would re-run the cell forever (see
  // ./mutable.js).
  let runningInputs = null;
  const isReading = (name) => runningInputs?.has(name) ?? false;
  // The current mutator of each promoted `let`, so writers can report that
  // they have run against it (see ./mutable.js).
  const mutators = new Map();

  // Writers by promoted name. A writer can fail before its variable's mutator
  // exists (a missing input rejects at once); the new mutator then counts it
  // as run, so later writers and readers don't wait on it forever.
  const writers = new Map();

  // Positions of cells to run again once the nodes match the code (see
  // runCells).
  let runAt = [];

  const trackInputs = (fn, inputs) => {
    const reads = new Set(inputs);
    return function (...args) {
      const previous = runningInputs;
      runningInputs = reads;
      try {
        return fn.apply(this, args);
      } finally {
        runningInputs = previous;
      }
    };
  };

  // The button function must be manually associated to the button registry.
  const __stdlib__ = {...stdlib, button: makeButton(buttonRegistry)};

  // The language's own names for parts of the stdlib (see ./languages/).
  const languageBuiltins = Object.entries(language.builtins?.(__stdlib__) ?? {}).map(([name, value]) => [
    name,
    () => value,
  ]);

  const runtime = new Runtime({
    recho: () => __stdlib__,
    __getEcho__: () => __getEcho__,
    __setEcho__: () => __setEcho__,
    ...Object.fromEntries(languageBuiltins),
  });

  const main = runtime.module();
  const nodesByKey = new Map();
  const dispatcher = d3Dispatch("changes", "error", "status");

  const refresh = debounce((code) => {
    if (disposed) return;
    const changes = removeChanges(code);

    // Construct an interval tree containing the ranges to be deleted.
    const removedIntervals = IntervalTree.from(changes, ({from, to}, index) =>
      from === to ? null : {interval: {low: from, high: to - 1}, data: index},
    );

    // Process and format output for all execution nodes
    const nodes = Array.from(nodesByKey.values()).flat(Infinity);
    const blocks = [];
    for (const node of nodes) {
      const start = node.start;
      let {values} = node.state;
      // A language's node that failed to compile shows its error at once, not
      // only when its variable rejects, so that the error doesn't flicker
      // when the node is replaced (its key has the message, see above).
      if (!values.length && language.nodes && node.error) values = [{options: {}, values: [node.error]}];
      const sourceRange = {from: node.start, to: node.end};
      // A language's warnings about a node go above its output, as output.
      const warnings = node.warnings?.length
        ? addPrefix(node.warnings.join("\n"), outputFormat.outputPrefix, outputFormat.formatLine)
        : null;

      if (!values.length && !warnings) {
        // Create a block even if there are no values.
        blocks.push(new BlockMetadata(node.id, node.type, null, sourceRange, node.state.attributes));
        continue;
      }

      const made = values.length ? makeOutput(values, outputFormat) : {output: null, error: false};
      const output = [warnings, made.output].filter((part) => part !== null).join("\n");
      const {error} = made;

      // The range of line numbers of output lines.
      let outputRange = null;

      // Search for existing changes and update the inserted text if found.
      const entry = removedIntervals.contains(start - 1);

      // Entry not found. This is a new output.
      if (entry === null) {
        changes.push({from: start, insert: output + "\n"});
        outputRange = {from: start, to: start};
      } else {
        const change = changes[entry.data];
        change.insert = output + "\n";
        outputRange = {from: change.from, to: change.to};
      }

      // Add this block to the block metadata array.
      const block = new BlockMetadata(node.id, node.type, outputRange, sourceRange, node.state.attributes);
      block.error = error;
      blocks.push(block);
    }

    blocks.sort((a, b) => a.from - b.from);

    // Attach block positions and attributes as effects to the transaction.
    // Blocks are computed from the untrimmed changes above, so trimming
    // below cannot disturb their ranges.
    const effects = [blockMetadataEffect.of(blocks)];

    // Shrink each replacement to the span that actually differs from the
    // current text. Re-echoing an unchanged frame then dispatches no change
    // at all, and animations touch only the region that moved — which keeps
    // editor churn (and the cursor remapping that comes with it) minimal.
    const trimmed = [];
    for (const c of changes) {
      const t = trimChange(code, c);
      if (t) trimmed.push(t);
    }

    dispatch(trimmed, effects);

    // A language's errors and warnings may refer to lines of the code (as
    // `(line:column)`), which writing output moves: split the new code, until
    // the output stops changing.
    const located = language.nodes && nodes.some((node) => node.error || node.warnings?.length);
    if (located && trimmed.length && isRunning && !disposed) rerun(currentCode());
  }, 0);

  function setCode(newCode) {
    code = newCode;
  }

  function setIsRunning(value) {
    isRunning = value;
    // Stopped, e.g. by an edit, which runAt can't follow.
    if (!value) runAt = [];
  }

  function dispatch(changes, effects = []) {
    // Cells to run again move with the output written above them.
    if (runAt.length) runAt = runAt.map((pos) => mapPos(changes, pos)).filter((pos) => pos !== null);
    dispatcher.call("changes", null, {changes, effects});
  }

  function onChanges(callback) {
    dispatcher.on("changes", callback);
  }

  function onError(callback) {
    dispatcher.on("error", callback);
  }

  // Whether a language's `nodes` has taken long enough (it may be compiling
  // in a worker) that the editor says so.
  let compiling = false;
  let compilingTimer = null;
  function setCompiling(value) {
    clearTimeout(compilingTimer);
    if (compiling === value) return;
    compiling = value;
    dispatcher.call("status", null, {compiling});
  }

  /** Calls `callback({compiling})` when a split starts or stops taking long. */
  function onStatus(callback) {
    dispatcher.on("status", callback);
  }

  function destroy() {
    setCompiling(false);
    disposed = true;
    isRunning = false;
    runtime.dispose();
  }

  function observer(state) {
    return {
      pending() {
        // A new run started: an earlier failure no longer counts as this
        // writer having run (see `writers`).
        state.failed = false;
      },
      fulfilled() {
        state.failed = false;
        state.settle?.();
        // Re-execute code to synchronize block positions after state changes.
        // Note: A more robust solution would involve applying changes from both
        // output generation and user edits, but this approach provides adequate
        // synchronization for the current implementation.
        if (!disposed && isRunning) rerun(code);
      },
      rejected(error) {
        state.failed = true;
        state.settle?.();
        if (disposed) return;
        const e = state.syntaxError || error;
        console.error(e);
        clear(state);
        echo(state, {}, e);
      },
    };
  }

  // The language's top-level parts: cells of JavaScript (`cells`) or
  // ready-made nodes (`nodes`, possibly as a promise). Shows the error a
  // language throws, as a syntax error, and returns null.
  function split(code) {
    try {
      return language.nodes ? language.nodes(code) : language.cells(code);
    } catch (error) {
      splitError(code, error);
      return null;
    }
  }

  function splitError(code, error) {
    // The code doesn't split, so there are no cells to run again.
    runAt = [];
    console.error(error);
    // Display the syntax error at the appropriate location.
    const from = language.errorOffset(code, error);
    const errorMsg =
      addPrefix(outputFormat.inspect(error, {}).format(), outputFormat.errorPrefix, outputFormat.formatLine) + "\n";
    dispatch(
      language.nodes ? nodesErrorChanges(code, from, errorMsg) : [...removeChanges(code), {from, insert: errorMsg}],
    );
    dispatcher.call("error", null, {source: "split", error});
  }

  // For a language of nodes, whose blocks compile separately, an error of
  // the whole document (or a compiler failure) isn't about the other blocks:
  // their output stays, and only error output (which may be from an earlier
  // such error) is replaced by this one.
  function nodesErrorChanges(code, from, errorMsg) {
    const changes = removeChanges(code).map((c) => {
      // Lines of output, each with its newline.
      const lines = code.slice(c.from, c.to).match(/[^\n]*\n?/g);
      const kept = lines.filter((line) => !line.startsWith(outputFormat.errorPrefix)).join("");
      // The error goes above the output that is right above its line.
      return {...c, insert: c.to === from ? errorMsg + kept : kept};
    });
    if (!changes.some((c) => c.to === from)) changes.push({from, insert: errorMsg});
    return changes.map((c) => trimChange(code, c)).filter(Boolean);
  }

  function transpile(cell, writes) {
    try {
      return transpileJavaScript(transpileRechoJavaScript(rewriteMutables(cell, writes)));
    } catch (error) {
      console.error(error);
      return {body: cell, inputs: [], outputs: [], error};
    }
  }

  // A node is what the runtime defines Observable variables for:
  // - `key`: its identity; a node with the same key as one in the previous
  //   run keeps that node's variables and state
  // - `start`, `end`: its range in the code
  // - `inputs`, `outputs`: the names it reads and the names it defines
  // - `hiddenOutputs`: names it defines for other nodes only (see ./languages/)
  // - `error`: an error to show instead of running it
  // - `definition(inputs)`: compiles its body into a function of `inputs`
  // - `defines`, `reads`, `mutators`, `extraInputs`, `chainOutputs`, `waits`:
  //   its part in promoted `let`s (see ./mutable.js)
  const noMutables = {defines: [], reads: [], mutators: {}, extraInputs: [], chainOutputs: [], waits: {}};

  // JavaScript cells -> nodes: find promoted `let`s, then let notebook-kit
  // work out each cell's inputs and outputs.
  function nodesOfCells(cells) {
    const mutables = analyzeMutables(cells.map((cell) => cell.js));
    return cells.map(({start, end, js}, i) => {
      const mutable = mutables[i];
      const {inputs, body, outputs, error = null} = transpile(js, mutable.writes);
      return {
        ...mutable,
        start,
        end,
        inputs,
        // A hidden output stays private to its cell.
        outputs: outputs.filter((o) => !language.isHiddenOutput(o)),
        hiddenOutputs: [],
        error,
        definition: (inputs) => safeEval(body, inputs, __setEcho__, compileCell),
      };
    });
  }

  // A language's nodes -> nodes: they already know their inputs and outputs,
  // and their body is that of an async function of the inputs.
  function nodesOfLanguage(nodes) {
    return nodes.map(({key, start, end, inputs, outputs, hiddenOutputs = [], body, error = null, warnings = []}) => {
      inputs = inputs.filter((i) => i !== "echo");
      return {
        ...noMutables,
        // With its error's message, which may refer to lines that moved.
        key: JSON.stringify([key, body, inputs, outputs, hiddenOutputs, error?.message ?? null]),
        start,
        end,
        inputs,
        outputs,
        hiddenOutputs,
        error,
        warnings,
        // A node that fails to compile shows why when it runs.
        definition(inputs) {
          const fail = (error) => () => {
            throw error;
          };
          if (error) return fail(error);
          try {
            return compileWrapper(`(async function(${inputs}) {\n${body}\n})`, inputs, __setEcho__, compileCell);
          } catch (error) {
            return fail(error);
          }
        },
      };
    });
  }

  /**
   * Get the changes that remove the output lines from the code.
   * @param {string} code The code to remove changes from.
   * @returns {{from: number, to: number, insert: ""}[]} An array of changes.
   */
  function removeChanges(code) {
    // A language can tell output lines apart from code that merely looks
    // like them (e.g. inside a multi-line string), by line number.
    const outputLines = language.outputLines?.(code);
    function matchAt(index, lineNumber) {
      if (outputLines) return outputLines.has(lineNumber);
      return code.startsWith(outputFormat.outputPrefix, index) || code.startsWith(outputFormat.errorPrefix, index);
    }

    /** Line number ranges (left-closed and right-open) of lines that contain output or error. */
    const lineNumbers = matchAt(0, 0) ? [{begin: 0, end: 1}] : [];
    /**
     * The index of the first character of each line.
     * If the code ends with a newline, the last index is the length of the code.
     */
    const lineStartIndices = [0];
    let nextNewlineIndex = code.indexOf("\n", 0);
    while (0 <= nextNewlineIndex && nextNewlineIndex < code.length) {
      lineStartIndices.push(nextNewlineIndex + 1);
      if (matchAt(nextNewlineIndex + 1, lineStartIndices.length - 1)) {
        const lineNumber = lineStartIndices.length - 1;
        if (lineNumbers.length > 0 && lineNumber === lineNumbers[lineNumbers.length - 1].end) {
          // Extend the last line number range.
          lineNumbers[lineNumbers.length - 1].end += 1;
        } else {
          // Append a new line number range.
          lineNumbers.push({begin: lineNumber, end: lineNumber + 1});
        }
      }
      nextNewlineIndex = code.indexOf("\n", nextNewlineIndex + 1);
    }

    const changes = lineNumbers.map(({begin, end}) => ({
      from: lineStartIndices[begin],
      to: lineStartIndices[end],
      insert: "",
    }));

    return changes;
  }

  function echo(state, options, ...values) {
    if (disposed || !isRunning) return;
    state.values.push({options, values});
    rerun(code);
  }

  function clear(state) {
    if (disposed || !isRunning) return;
    state.values = [];
    rerun(code);
  }

  // The number of the latest split, and whether its parts are still being
  // computed (a language's `nodes` can return a promise, e.g. when it
  // compiles in a worker).
  let splitId = 0;
  let splitting = false;

  function rerun(code) {
    if (disposed) return;
    if (code === prevCode) {
      // The current nodes are for an earlier code until the split ends.
      if (!splitting) {
        forcePending();
        refresh(code);
      }
      return;
    }

    prevCode = code;
    isRunning = true;

    // Start a new execution cycle for button registry
    // This allows buttons to be re-registered while detecting duplicates within the same execution
    buttonRegistry.startExecution();

    const id = ++splitId;
    const parts = split(code);
    if (typeof parts?.then !== "function") {
      splitting = false;
      setCompiling(false);
      if (parts) updateNodes(code, parts);
      return;
    }
    // Only the latest split's parts are used: a newer run wins over an
    // earlier one that ends later.
    splitting = true;
    clearTimeout(compilingTimer);
    compilingTimer = setTimeout(() => setCompiling(true), COMPILING_DELAY);
    const done = (use) => (result) => {
      if (disposed || id !== splitId) return;
      splitting = false;
      setCompiling(false);
      if (code === currentCode()) return use(code, result);
      // The code changed while splitting, so the offsets are for the old
      // code: split the new code instead (unless an edit stopped running).
      prevCode = null;
      if (isRunning) rerun(currentCode());
    };
    parts.then(done(updateNodes), done(splitError));
  }

  const currentCode = () => code;

  // Replaces the nodes with those of `parts` (of `code`), re-running only
  // those that changed.
  function updateNodes(code, parts) {
    const nodes = language.nodes ? nodesOfLanguage(parts) : nodesOfCells(parts);
    for (const node of nodes) node.id = uid();

    const groups = group(nodes, (n) => n.key);
    const enter = [];
    const remove = [];
    const exit = new Set(nodesByKey.keys());

    for (const [key, nodes] of groups) {
      if (nodesByKey.has(key)) {
        exit.delete(key);
        const preNodes = nodesByKey.get(key);
        const pn = preNodes.length;
        const n = nodes.length;
        if (n > pn) {
          const newNodes = nodes.slice(pn);
          enter.push(...newNodes);
          preNodes.push(...newNodes);
        } else if (n < pn) {
          const oldNodes = preNodes.slice(n);
          remove.push(...oldNodes);
        }
        // Transfer state from previous nodes to updated nodes.
        for (let i = 0; i < Math.min(n, pn); i++) {
          nodes[i].state = preNodes[i].state;
        }
      } else {
        enter.push(...nodes);
      }
      nodesByKey.set(key, nodes);
    }

    for (const key of exit) {
      const preNodes = nodesByKey.get(key);
      remove.push(...preNodes);
      nodesByKey.delete(key);
    }

    for (const node of remove) {
      for (const {name} of node.state.chainOutputs ?? []) writers.get(name)?.delete(node.state);
      const {variables} = node.state;
      for (const variable of variables) variable.delete();
    }

    // Derived from Observable Notebook Kit's define.
    // https://github.com/observablehq/notebook-kit/blob/02914e034fd21a50ebcdca08df57ef5773864125/src/runtime/define.ts#L33
    for (const node of enter) {
      const vid = node.id;
      const {inputs, outputs, hiddenOutputs, error} = node;
      const {defines, reads, mutators: mutatorNames, extraInputs, chainOutputs, waits} = node;
      const state = {
        values: [],
        variables: [],
        error: null,
        syntaxError: error,
        doc: false,
        attributes: Object.create(null),
      };
      node.state = state;
      if (chainOutputs.length) {
        state.chainOutputs = chainOutputs;
        state.settle = () => chainOutputs.forEach(({name, index}) => mutators.get(name)?.settle(index));
        for (const {name} of chainOutputs) {
          if (!writers.has(name)) writers.set(name, new Set());
          writers.get(name).add(state);
        }
      }
      const v = main.variable(observer(state), {shadow: {}});

      // Create echo variable for every node to support internal echo calls.
      // This ensures echo functionality works even when not explicitly used in code,
      // such as `add(1, 2)`, because the evaluated code may call echo internally.
      let echoVersion = -1;
      // How many times the cell has been run on its own (see runCells). The
      // echo reads it, so running the cell again makes a new echo, as when an
      // input changes: the old echo is disposed of, and calls to it (e.g.
      // from a timer of the previous run) are stale.
      const runs = `${vid}:runs`;
      let runCount = 0;
      const vr = main.variable().define(runs, [], runCount);
      const vd = new v.constructor(2, v._module);
      const echoInputs = ["invalidation", ...inputs.filter((i) => i !== "echo" && i !== "invalidation"), runs];
      vd.define(echoInputs, (invalidation) => {
        const options = {};
        const version = v._version; // Capture version on input change.
        const __echo__ = (value, ...args) => {
          if (version < echoVersion) throw new Error("stale echo");
          else if (state.variables[0] !== v) throw new Error("stale echo");
          else if (version > echoVersion) clear(state);
          echoVersion = version;
          echo(state, {...options}, value, ...args);
          return args.length ? [value, ...args] : value;
        };
        const disposes = [];
        __echo__.clear = () => clear(state);
        __echo__.set = function (key, value) {
          state.attributes[key] = value;
          return this;
        };
        __echo__.dispose = (cb) => disposes.push(cb);
        __echo__.key = (k) => ((options.key = k), __echo__);
        __echo__.__dispose__ = () => {
          const callbacks = disposes.splice(0);
          callbacks.forEach((cb) => {
            try {
              cb();
            } catch (error) {
              console.error(error);
            }
          });
        };
        // Helpers such as `visualize(array)` may call echo.dispose even when
        // this cell's source never mentions echo.
        invalidation.then(__echo__.__dispose__);
        return __echo__;
      });
      v._shadow.set("echo", vd);
      // Extra inputs aren't necessarily referenced by the body: they re-run
      // the cell when its variable starts over, and order it after the
      // previous writer.
      const newInputs = [...new Set([...inputs, ...extraInputs]), "echo"];
      const definition = trackInputs(node.definition(newInputs), reads);
      // The cell's own variable comes first (see __echo__).
      state.variables.push(v.define(vid, newInputs, definition), vr);
      // Runs the cell, and the cells that read it, again.
      state.force = () => vr.define(runs, [], ++runCount);

      // Export cell-level variables for external access. A promoted `let`
      // is exported as its mutator plus the mutator's live value.
      for (const o of outputs) {
        if (defines.includes(o)) {
          const mutator = mutatorNames[o];
          const create = (exports) => {
            const m = createMutator(o, exports[o], isReading);
            mutators.set(o, m);
            for (const writer of writers.get(o) ?? []) {
              if (!writer.failed) continue;
              for (const {name, index} of writer.chainOutputs) if (name === o) m.settle(index);
            }
            return m;
          };
          // Readers wait until the last writer has run, so they never see
          // the initial value just before it is overwritten.
          const inputs = waits[o] ? [mutator, waits[o]] : [mutator];
          state.variables.push(
            main.variable().define(mutator, [vid], create),
            main.variable(true).define(o, inputs, (mutator) => mutator.mutable),
          );
        } else {
          state.variables.push(main.variable(true).define(o, [vid], (exports) => exports[o]));
        }
      }
      // Hidden outputs aren't observed: they're computed only for the nodes
      // that read them.
      for (const o of hiddenOutputs) {
        state.variables.push(main.variable().define(o, [vid], (exports) => exports[o]));
      }
      for (const {name, index, variable} of chainOutputs) {
        state.variables.push(main.variable().define(variable, [mutatorNames[name]], (m) => m.settled(index)));
      }
    }

    forcePending(enter);
    refresh(code);
  }

  // Runs the cells at `runAt` again, except those that just entered (and so
  // run anyway) and positions with no cell (e.g. it was deleted).
  function forcePending(entered = []) {
    if (!runAt.length) return;
    const positions = runAt;
    runAt = [];
    const nodes = Array.from(nodesByKey.values()).flat(Infinity);
    for (const node of nodes) {
      if (entered.includes(node)) continue;
      if (positions.some((pos) => node.start <= pos && pos < node.end)) node.state.force();
    }
  }

  function run() {
    rerun(code);
  }

  /**
   * Runs the code, as `run` does, and then the cells whose source contains
   * one of `positions` again, even if unchanged, along with the cells that
   * read them.
   */
  function runCells(positions) {
    isRunning = true;
    runAt = [...positions];
    rerun(code);
  }

  return {
    setCode,
    setIsRunning,
    run,
    runCells,
    onChanges,
    onError,
    onStatus,
    destroy,
    isRunning: () => isRunning,
    buttonRegistry,
  };
}
