// Derived from Observable Notebook Kit's observe.
// https://github.com/observablehq/notebook-kit/blob/main/src/runtime/stdlib/generators/observe.ts

export async function* observe(initialize) {
  let resolve = undefined;
  let value = undefined;
  let stale = false;

  const dispose = initialize((x) => {
    value = x;
    if (resolve) {
      resolve(x);
      resolve = undefined;
    } else {
      stale = true;
    }
    return x;
  });

  if (dispose != null && typeof dispose !== "function") {
    throw new Error(
      typeof dispose === "object" && "then" in dispose && typeof dispose.then === "function"
        ? "async initializers are not supported"
        : "initializer returned something, but not a dispose function",
    );
  }

  try {
    while (true) {
      yield stale ? ((stale = false), value) : new Promise((_) => (resolve = _));
    }
  } finally {
    if (dispose != null) {
      dispose();
    }
  }
}
