import {findAssignedReferences, findReferences, patternNames} from "./references.js";
import {parseModule} from "./parse.js";
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
 * - A writer assigns `x` (even inside a callback), or references a function
 *   or value declared by another writer, e.g. calls `inc()`. A direct writer
 *   has every free `x` rewritten to `mutator$x.value`; it doesn't depend on
 *   `x`, so its own writes never re-run it.
 * - A reader (any other cell mentioning `x`) is unchanged and re-runs when `x`
 *   changes.
 *
 * The definer and the writers form a group, and each member's key includes
 * the source of the whole group: editing any member re-runs all of them, so
 * `x` starts over from its initial value instead of building on the previous
 * result.
 *
 * For each mutator (i.e. each time `x` starts over), writers run in source
 * order, and readers only see `x` once the last writer has run. Writer k waits
 * on `chain$x$(k-1)`, a promise that settles when writer k-1 has run against
 * the current mutator, whether it succeeded or threw; `x` waits on the last
 * one. These are promises rather than dependencies on the writer cells, so a
 * writer re-running on its own (say, on each `recho.interval` tick) doesn't
 * re-run the others, and its errors don't spread to them. A writer that would
 * wait on itself through this ordering (it reads `x`, or an earlier writer
 * uses something it defines) is left out of the order instead of deadlocking.
 */

export const mutatorName = (name) => `mutator$${name}`;

export const chainName = (name, index) => `chain$${name}$${index}`;

// analyzeCell is a pure function of the source, and most cells don't change
// between runs, so its results are cached (and the cache dropped when large).
const cellCache = new Map();

function analyzeCellCached(source) {
  let cell = cellCache.get(source);
  if (!cell) {
    if (cellCache.size > 2000) cellCache.clear();
    cellCache.set(source, (cell = analyzeCell(source)));
  }
  return cell;
}

function analyzeCell(source) {
  let program;
  try {
    program = parseModule(source);
  } catch {
    return {lets: [], declared: [], references: new Set(), writes: new Set()};
  }
  const lets = [];
  const declared = [];
  for (const child of program.body) {
    switch (child.type) {
      case "VariableDeclaration": {
        const names = child.declarations.flatMap((d) => patternNames(d.id));
        declared.push(...names);
        if (child.kind !== "const") lets.push(...names);
        break;
      }
      case "FunctionDeclaration":
      case "ClassDeclaration":
        declared.push(child.id.name);
        break;
      case "ImportDeclaration":
        declared.push(...child.specifiers.map((s) => s.local.name));
        break;
    }
  }
  const references = findReferences(program);
  const writes = new Set(findAssignedReferences(program, references).map((node) => node.name));
  return {lets, declared, references: new Set(references.map((node) => node.name)), writes};
}

/**
 * Analyze the cells of a notebook (their sources, in source order) and return,
 * for each cell:
 *
 * - `defines`: promoted names this cell declares
 * - `writes`: promoted names this cell assigns directly (to rewrite)
 * - `extraInputs`: hidden inputs (mutators and `chain$` promises to wait on)
 * - `chainOutputs`: `{name, index}` for each `chain$name$index` it settles
 * - `waits`: for a definer, the `chain$` variable each name waits on
 * - `key`: the cell's identity for re-use between runs
 */
export function analyzeMutables(sources) {
  const cells = sources.map(analyzeCellCached);

  // Names declared by exactly one top-level let/var, and who declares what.
  const definers = new Map();
  const duplicates = new Set();
  const declarers = new Map();
  cells.forEach(({lets, declared}, i) => {
    for (const name of lets) {
      if (definers.has(name)) duplicates.add(name);
      else definers.set(name, i);
    }
    for (const name of declared) declarers.set(name, i);
  });
  const isCandidate = (name, i) => definers.has(name) && !duplicates.has(name) && definers.get(name) !== i;

  // Direct writes, then what each cell may change through what it references
  // (calling `inc()` changes what `inc` changes), until nothing new is found.
  const direct = cells.map(({writes}, i) => new Set([...writes].filter((name) => isCandidate(name, i))));
  const effects = direct.map((writes) => new Set(writes));
  for (let changed = true; changed; ) {
    changed = false;
    cells.forEach(({references}, i) => {
      for (const reference of references) {
        const j = declarers.get(reference);
        if (j === undefined || j === i) continue;
        for (const name of effects[j]) {
          if (!effects[i].has(name) && isCandidate(name, i)) {
            effects[i].add(name);
            changed = true;
          }
        }
      }
    });
  }

  const promoted = [...new Set(direct.flatMap((writes) => [...writes]))].sort(
    (a, b) => definers.get(a) - definers.get(b),
  );
  const promotedSet = new Set(promoted);

  // What each cell waits on: cells declaring what it references, the value of
  // promoted names it reads, and (added below) the writer before it.
  const valueNode = (name) => `value:${name}`;
  const edges = new Map();
  const addEdge = (from, to) => (edges.has(from) ? edges.get(from).add(to) : edges.set(from, new Set([to])));
  cells.forEach(({references}, i) => {
    for (const reference of references) {
      if (promotedSet.has(reference) && !direct[i].has(reference)) addEdge(i, valueNode(reference));
      else if (declarers.has(reference) && declarers.get(reference) !== i) addEdge(i, declarers.get(reference));
    }
  });
  for (const name of promoted) addEdge(valueNode(name), definers.get(name));
  const dependsOn = (from, target, seen = new Set()) => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    for (const next of edges.get(from) ?? []) if (dependsOn(next, target, seen)) return true;
    return false;
  };

  const result = sources.map((source, i) => ({
    defines: [],
    writes: [...direct[i]].filter((name) => promotedSet.has(name)),
    extraInputs: [],
    chainOutputs: [],
    waits: {},
    groups: [],
    key: source,
  }));

  for (const name of promoted) {
    const definer = definers.get(name);
    const members = effects.flatMap((names, i) => (names.has(name) ? [i] : []));
    const signature = [name, ...[definer, ...members].map((i) => sources[i])].join("\0");
    result[definer].defines.push(name);
    result[definer].groups.push(signature);

    const chained = [];
    for (const cell of members) {
      const info = result[cell];
      info.groups.push(signature);
      info.extraInputs.push(mutatorName(name));
      const previous = chained.at(-1);
      if (dependsOn(cell, valueNode(name)) || (previous !== undefined && dependsOn(previous, cell))) continue;
      if (previous !== undefined) {
        info.extraInputs.push(chainName(name, chained.length - 1));
        addEdge(cell, previous);
      }
      info.chainOutputs.push({name, index: chained.length});
      chained.push(cell);
    }
    if (chained.length) {
      result[definer].waits[name] = chainName(name, chained.length - 1);
      addEdge(valueNode(name), chained.at(-1));
    }
  }

  for (const info of result) {
    const {groups, extraInputs, chainOutputs, waits} = info;
    if (groups.length) info.key += "\0" + JSON.stringify({groups, extraInputs, chainOutputs, waits});
    delete info.groups;
  }

  return result;
}

/**
 * Create the mutator for a promoted variable. `isReading()` reports whether
 * the cell running synchronously right now reads `name` reactively: such a
 * cell would re-run itself forever by writing to it, so that's an error.
 * `settle(k)` marks writer k as having run against this mutator, and
 * `settled(k)` is the promise later writers and readers wait on.
 */
export function createMutator(name, value, isReading) {
  const mutable = Mutable(value, {emitUndefined: true});
  const runs = new Map();
  const run = (index) => {
    if (!runs.has(index)) {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      runs.set(index, {promise, resolve});
    }
    return runs.get(index);
  };
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
    settle: (index) => run(index).resolve(),
    settled: (index) => run(index).promise,
  };
}
