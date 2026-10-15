import {Parser} from "acorn";
import {findAssignedReferences, findReferences} from "./references.js";
import {Mutable} from "./stdlib/state.js";

/**
 * Top-level `let` support.
 *
 * Every top-level statement is an Observable cell, and a cell can't assign to
 * a variable defined by another cell. So a top-level `let x` that some other
 * cell assigns to is *promoted* to a mutable, and each cell takes a role:
 *
 * - The definer (`let x = init`) is compiled as usual; the runtime wraps its
 *   exported `x` in a mutator, exposed as the variable `mutator$x`, and
 *   defines `x` as the mutator's generator, so readers get the live value.
 * - A writer (any cell that assigns `x`, even inside a callback) has every free
 *   `x` rewritten to `mutator$x.value`. It doesn't depend on `x`, so its own
 *   writes never re-run it.
 * - A reader (any other cell mentioning `x`) is unchanged and re-runs when `x`
 *   changes.
 *
 * Writers run in source order: writer k depends on `chain$x$(k-1)`, defined
 * by writer k-1. The definer and the writers form a group, and each member's
 * key includes the source of the whole group: editing any member re-runs all
 * of them, so `x` starts over from its initial value instead of building on
 * the previous result.
 */

export const mutatorName = (name) => `mutator$${name}`;

const chainName = (name, index) => `chain$${name}$${index}`;

function parseCell(source) {
  try {
    return Parser.parse(source, {ecmaVersion: "latest", sourceType: "module"});
  } catch {
    return null;
  }
}

function declaredNames(pattern, names = []) {
  switch (pattern.type) {
    case "Identifier":
      names.push(pattern.name);
      break;
    case "ObjectPattern":
      pattern.properties.forEach((p) => declaredNames(p.type === "Property" ? p.value : p, names));
      break;
    case "ArrayPattern":
      pattern.elements.forEach((e) => e && declaredNames(e, names));
      break;
    case "RestElement":
      declaredNames(pattern.argument, names);
      break;
    case "AssignmentPattern":
      declaredNames(pattern.left, names);
      break;
  }
  return names;
}

function analyzeCell(source) {
  const program = parseCell(source);
  if (!program) return {lets: [], writes: new Set()};
  const lets = [];
  for (const child of program.body) {
    if (child.type === "VariableDeclaration" && child.kind !== "const") {
      for (const d of child.declarations) declaredNames(d.id, lets);
    }
  }
  const references = findReferences(program);
  const writes = new Set(findAssignedReferences(program, references).map((node) => node.name));
  return {lets, writes};
}

/**
 * Analyze the cells of a notebook (their sources, in source order) and return,
 * for each cell:
 *
 * - `defines`: promoted names this cell declares
 * - `writes`: promoted names this cell assigns
 * - `chainInputs` / `chainOutputs`: hidden variables ordering the writers
 * - `key`: the cell's identity for re-use between runs
 */
export function analyzeMutables(sources) {
  const cells = sources.map(analyzeCell);

  // Names declared by exactly one top-level let/var.
  const definers = new Map();
  const duplicates = new Set();
  cells.forEach(({lets}, i) => {
    for (const name of lets) {
      if (definers.has(name)) duplicates.add(name);
      else definers.set(name, i);
    }
  });

  // name -> indices of writer cells, in source order.
  const writers = new Map();
  cells.forEach(({writes}, i) => {
    for (const name of writes) {
      if (!definers.has(name) || duplicates.has(name) || definers.get(name) === i) continue;
      if (writers.has(name)) writers.get(name).push(i);
      else writers.set(name, [i]);
    }
  });

  const result = sources.map((source) => ({
    defines: [],
    writes: [],
    chainInputs: [],
    chainOutputs: [],
    groups: [],
    key: source,
  }));

  for (const [name, indices] of writers) {
    const definer = definers.get(name);
    const signature = [name, definer, ...indices].map((i) => (typeof i === "number" ? sources[i] : i)).join("\0");
    result[definer].defines.push(name);
    result[definer].groups.push(signature);
    indices.forEach((cell, k) => {
      const info = result[cell];
      info.writes.push(name);
      info.groups.push(signature);
      if (k > 0) info.chainInputs.push(chainName(name, k - 1));
      if (k < indices.length - 1) info.chainOutputs.push(chainName(name, k));
    });
  }

  for (const info of result) {
    if (info.groups.length) info.key += "\0" + JSON.stringify(info.groups);
    delete info.groups;
  }

  return result;
}

/**
 * Create the mutator for a promoted variable. `isReading()` reports whether
 * the cell running synchronously right now reads `name` reactively: such a
 * cell would re-run itself forever by writing to it, so that's an error.
 */
export function createMutator(name, value, isReading) {
  const mutable = Mutable(value, {emitUndefined: true});
  return {
    mutable,
    get value() {
      return mutable.value;
    },
    set value(v) {
      if (isReading(name)) {
        throw new Error(`\`${name}\` is read and changed in the same block. Split it into two blocks.`);
      }
      mutable.value = v;
    },
  };
}
