import {recursive, simple} from "acorn-walk";
import {Sourcemap} from "./sourcemap.js";
import {parseModule} from "./parse.js";
import {findReferences} from "./references.js";

function parseParams(params) {
  return params.map((p) => (p.type === "AssignmentPattern" ? p.left.name : p.name));
}

/**
 * Transforms echo function calls within JavaScript functions to ensure proper
 * echo context handling. For top-level function nodes, defines a local echo
 * variable. For nested function nodes, implements conditional echo resolution
 * to maintain correct execution context.
 *
 * Examples:
 *
 * Top-level function transformation:
 * ```js
 * const adder = () => (x, y) => echo(x, y);
 * const add = adder();
 * add(1, 2); // Uses the updated echo function context
 * ```
 *
 * Nested function transformation:
 * ```js
 * const asyncAdd = () => (x, y) => setTimeout(() => echo(x + y), 0);
 * const add = asyncAdd();
 * add(1, 2); // Preserves original echo function context
 * ```
 */
function rewriteEchoInFunction(input) {
  if (!input.includes("echo")) return input;

  const body = parseModule(input);
  const output = new Sourcemap(input);
  const echoNodes = [];
  const topLevelEchoNodes = [];
  const state = {depth: 0};

  // Fallback to cell-level echo function if no echo function is available.
  // For example, `setTimeout(() => echo(1), 0)`
  output.insertLeft(body.start, "let __cellEcho__ = __getEcho__();invalidation.then(__cellEcho__.__dispose__);");

  recursive(body, state, {
    Function(node, state, c) {
      if (parseParams(node.params).includes("echo")) return;
      if (state.depth === 0) topLevelEchoNodes.push(node);
      else echoNodes.push(node);
      state.depth++;
      c(node.body, state);
      state.depth--;
    },
  });

  for (const node of topLevelEchoNodes) {
    if (node.body.type === "BlockStatement") {
      output.insertLeft(node.body.start + 1, "const echo = __getEcho__() || __cellEcho__;");
    }
  }

  for (const node of echoNodes) {
    if (node.body.type === "BlockStatement") {
      const source = input.slice(node.body.start + 1, node.body.end - 1);
      output.insertLeft(node.body.start + 1, `if(__getEcho__()) {const echo = __getEcho__(); ${source}; return;}`);
    }
  }

  return String(output);
}

function rewriteArrowFunction(input) {
  const body = parseModule(input);
  const output = new Sourcemap(input);
  const arrowExpressions = [];
  simple(body, {
    ArrowFunctionExpression(node) {
      if (!node.expression) return;
      else arrowExpressions.push(node);
    },
  });
  for (const node of arrowExpressions) {
    // The arrow comes after the last parameter, which may hold arrows of its
    // own, e.g. `(f = () => 1) => f()`.
    const params = node.params.length ? node.params[node.params.length - 1].end : node.start;
    const arrow = input.indexOf("=>", params);
    // The body is wrapped in parentheses: it may start on the next line, where
    // a bare `return` would end the statement and return undefined.
    output.insertLeft(arrow + 2, "{return (");
    output.insertLeft(node.end, ");}");
  }
  return String(output);
}

/**
 * Rewrites every free reference to the given promoted top-level `let` names to
 * go through their mutator, so the cell can assign them (see ./mutable.js).
 * `mutators` maps each name to its mutator variable, e.g. `{count: "m"}`:
 *
 * ```js
 * count += 1;          // count += 1  ->  m.value += 1
 * const o = {count};   // shorthand   ->  {count: m.value}
 * ```
 */
export function rewriteMutables(input, mutators) {
  if (!Object.keys(mutators).length) return input;
  const body = parseModule(input);
  const references = findReferences(body).filter((node) => Object.hasOwn(mutators, node.name));
  if (!references.length) return input;

  // Identifiers written as shorthand properties, `{x}` or `({x} = …)`, need
  // their key spelled out once the value is no longer a plain identifier.
  const shorthands = new Set();
  const collectShorthands = (node) => {
    for (const p of node.properties) {
      if (p.type !== "Property" || !p.shorthand) continue;
      shorthands.add(p.value.type === "AssignmentPattern" ? p.value.left.start : p.value.start);
    }
  };
  simple(body, {ObjectExpression: collectShorthands, ObjectPattern: collectShorthands});

  const output = new Sourcemap(input);
  for (const node of references) {
    const value = `${mutators[node.name]}.value`;
    output.replaceLeft(node.start, node.end, shorthands.has(node.start) ? `${node.name}: ${value}` : value);
  }
  return String(output);
}

export function transpileRechoJavaScript(input) {
  let output = input;
  output = rewriteArrowFunction(output);
  output = rewriteEchoInFunction(output);
  return output;
}
