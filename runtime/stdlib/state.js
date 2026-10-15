// Derived from Observable Notebook Kit's mutable and mutator.
// https://github.com/observablehq/notebook-kit/blob/main/src/runtime/stdlib/mutable.ts
import {observe} from "./observe.js";

// Mutable returns a generator with a value getter/setting that allows the
// generated value to be mutated. Therefore, direct mutation is only allowed
// within the defining cell, but the cell can also export functions that allows
// other cells to mutate the value as desired.
//
// By default an undefined initial value isn't emitted, so readers stay pending
// until the first assignment. Top-level `let x;` wants readers to see
// `undefined` right away, hence `emitUndefined`.
export function Mutable(value, {emitUndefined = false} = {}) {
  let change = undefined;
  const mutable = observe((_) => {
    change = _;
    if (value !== undefined || emitUndefined) change(value);
  });
  return Object.defineProperty(mutable, "value", {
    get: () => value,
    set: (x) => ((value = x), void change?.(value)),
  });
}

export function state(value) {
  const state = Mutable(value);
  const setState = (x) => (typeof x === "function" ? (state.value = x(state.value)) : (state.value = x));
  const getState = () => state.value;
  return [state, setState, getState];
}
