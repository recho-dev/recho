import {transpileJavaScript} from "@observablehq/notebook-kit";
import {Runtime} from "@observablehq/runtime";
import inspector from "object-inspect";
import {parse} from "acorn";
import {group, groups} from "d3-array";
import {dispatch as d3Dispatch} from "d3-dispatch";
import * as stdlib from "./stdlib.js";
import {OUTPUT_MARK} from "./constant.js";

const PREFIX = `//${OUTPUT_MARK}`;

const BUILTINS = {
  recho: () => stdlib,
};

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function safeEval(code, inputs) {
  const body = `const foo = ${code}; return foo(${inputs.join(",")})`;
  const fn = new Function(...inputs, body);
  return fn;
}

function debounce(fn, delay = 0) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function isMultiline(value) {
  const isString = typeof value === "string";
  if (!isString) return false;
  const lines = value.split("\n");
  return lines.length > 1;
}

function inspect(value, {limit = 200, quote = "double", indent = null} = {}) {
  if (isMultiline(value)) return value;
  if (typeof value === "string" && !quote) return value;
  const string = inspector(value, {indent, quoteStyle: quote});
  if (string.length > limit) return string.slice(0, limit) + "…";
  return string;
}

function embed(string) {
  const lines = string.split("\n");
  return lines.map((line) => `${PREFIX} ${line}`).join("\n");
}

function format(value, options) {
  const string = inspect(value, options);
  return embed(string);
}

export function createRuntime(initialCode) {
  let code = initialCode;
  let prevCode = null;
  let isRunning = false;
  let noSyntaxError = false;

  const runtime = new Runtime(BUILTINS);
  const main = runtime.module();
  const nodesByKey = new Map();
  const dispatcher = d3Dispatch("changes");

  const refresh = debounce((code) => {
    const changes = removeChanges(code);

    // Insert new outputs
    const nodes = Array.from(nodesByKey.values()).flat(Infinity);
    for (const node of nodes) {
      const start = node.start;
      const {values} = node.state;
      const groupValues = groups(values, (v) => v.options?.key);
      let output = "";
      for (let i = 0; i < groupValues.length; i++) {
        const [key, values] = groupValues[i];
        const f = values.map(({value, options}) => inspect(value, options));
        output += key === undefined ? f : key + ": " + f;
        output += i === groupValues.length - 1 ? "" : "\n";
      }
      if (output) changes.push({from: start, insert: embed(output) + "\n"});
    }

    dispatch(changes);
  }, 0);

  function setCode(newCode) {
    code = newCode;
  }

  function setIsRunning(value) {
    isRunning = value;
  }

  function dispatch(changes) {
    dispatcher.call("changes", null, changes);
  }

  function onChanges(callback) {
    dispatcher.on("changes", callback);
  }

  function destroy() {
    runtime.dispose();
  }

  function observer(state) {
    return {
      pending() {
        clear(state);
        if (state.doc) echo(state, "Pending…", {quote: false});
      },
      fulfilled() {
        // Before blocks are fulfilled, their position might be changed or
        // they might be removed. Run `run` to make sure the position of blocks are updated.
        // The better way is to sync the position by applying all the changes, from both the
        // output and the user edits. But it's not easy to implement.
        if (isRunning) rerun(code);
      },
      rejected(error) {
        console.error(error);
        clear(state);
        echo(state, error);
      },
    };
  }

  function split(code) {
    try {
      return parse(code, {ecmaVersion: "latest", sourceType: "module"}).body;
    } catch (error) {
      console.error(error);
      const changes = removeChanges(code);
      const errorMsg = format(error) + "\n";
      changes.push({from: 0, insert: errorMsg});
      dispatch(changes);
      return null;
    }
  }

  function transpile(cell, code) {
    try {
      return transpileJavaScript(cell);
    } catch (error) {
      console.error(error);
      const changes = removeChanges(code);
      const errorMsg = format(error) + "\n";
      changes.push({from: 0, insert: errorMsg});
      dispatch(changes);
      return null;
    }
  }

  function removeChanges(code) {
    const changes = [];

    const oldOutputs = code
      .split("\n")
      .map((l, i) => [l, i])
      .filter(([l]) => l.startsWith(PREFIX))
      .map(([_, i]) => i);

    const lineOf = (i) => {
      const lines = code.split("\n");
      const line = lines[i];
      const from = lines.slice(0, i).join("\n").length;
      const to = from + line.length;
      return {from, to};
    };

    for (const i of oldOutputs) {
      const line = lineOf(i);
      const from = line.from;
      const to = line.to + 1 > code.length ? line.to : line.to + 1;
      changes.push({from, to, insert: ""});
    }

    return changes;
  }

  function echo(state, value, options) {
    if (!isRunning) return;
    state.values.push({value, options});
    rerun(code);
  }

  function clear(state) {
    if (!isRunning) return;
    state.values = [];
    rerun(code);
  }

  function rerun(code) {
    // If the code is the same as the pervious one, and the previous code has no syntax error,
    // there is no need to to update the position of blocks. So skip the diffing and just
    // refresh the outputs.
    if (code === prevCode && noSyntaxError) return refresh(code);

    prevCode = code;
    isRunning = true;
    noSyntaxError = false;

    const nodes = split(code);
    if (!nodes) return;

    for (const node of nodes) {
      const cell = code.slice(node.start, node.end);
      const transpiled = transpile(cell, code);
      node.transpiled = transpiled;
    }
    if (nodes.some((n) => !n.transpiled)) return;
    noSyntaxError = true;

    const groups = group(nodes, (n) => code.slice(n.start, n.end));
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
        // Pass states to new nodes.
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
      const {variables} = node.state;
      for (const variable of variables) variable.delete();
    }

    // @ref https://github.com/observablehq/notebook-kit/blob/02914e034fd21a50ebcdca08df57ef5773864125/src/runtime/define.ts#L33
    for (const node of enter) {
      const vid = uid();
      const state = {values: [], variables: [], error: null, doc: false};
      node.state = state;
      const {inputs, body, outputs} = node.transpiled;
      const v = main.variable(observer(state), {shadow: {}});
      if (inputs.includes("echo")) {
        state.doc = true;
        let docVersion = -1;
        const vd = new v.constructor(2, v._module);
        vd.define(
          inputs.filter((i) => i !== "echo" && i !== "clear"),
          () => {
            const version = v._version; // Capture version on input change.
            return (value, options) => {
              if (version < docVersion) throw new Error("stale echo");
              else if (state.variables[0] !== v) throw new Error("stale echo");
              else if (version > docVersion) clear(state);
              docVersion = version;
              echo(state, value, options);
              return value;
            };
          },
        );
        v._shadow.set("echo", vd);
      }
      if (inputs.includes("clear")) {
        let clearVersion = -1;
        const vc = new v.constructor(2, v._module);
        vc.define(
          inputs.filter((i) => i !== "clear" && i !== "echo"),
          () => {
            const version = v._version;
            return () => {
              if (version < clearVersion) throw new Error("stale clear");
              else if (state.variables[0] !== v) throw new Error("stale clear");
              clearVersion = version;
              clear(state);
            };
          },
        );
        v._shadow.set("clear", vc);
      }
      state.variables.push(v.define(vid, inputs, safeEval(body, inputs)));
      for (const o of outputs) {
        state.variables.push(main.variable(true).define(o, [vid], (exports) => exports[o]));
      }
    }

    refresh(code);
  }

  function run() {
    rerun(code);
  }

  return {setCode, setIsRunning, run, onChanges, destroy, isRunning: () => isRunning};
}
