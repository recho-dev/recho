// Derived from Observable Notebook Kit's mutable and mutator.
// https://github.com/observablehq/notebook-kit/blob/main/src/runtime/stdlib/mutable.ts
import {observe} from "./observe.js";

// Mutable returns a generator with a value getter/setting that allows the
// generated value to be mutated. Therefore, direct mutation is only allowed
// within the defining cell, but the cell can also export functions that allows
// other cells to mutate the value as desired.
function Mutable(value) {
  let change = undefined;
  const mutable = observe((_) => {
    change = _;
    if (value !== undefined) change(value);
  });
  return Object.defineProperty(mutable, "value", {
    get: () => value,
    set: (x) => ((value = x), void change?.(value)),
  });
}

export function Mutator(value) {
  const mutable = Mutable(value);
  return [
    mutable,
    {
      get value() {
        return mutable.value;
      },
      set value(v) {
        mutable.value = v;
      },
    },
  ];
}
