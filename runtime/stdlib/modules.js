// How `recho.require` hands loaded modules to notebooks.

function isObject(value) {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

// `module`, with the keys it lacks looked up in `fallbacks`, in order. The
// module itself isn't changed: the proxy wraps a copy of its own keys.
function withFallbacks(module, fallbacks) {
  return new Proxy(
    {...module},
    {
      get(target, key) {
        if (key in target) return target[key];
        for (const fallback of fallbacks) if (key in fallback) return Reflect.get(fallback, key);
        return undefined;
      },
      has(target, key) {
        return key in target || fallbacks.some((fallback) => key in fallback);
      },
    },
  );
}

/**
 * A loaded module as notebooks see it: a CommonJS module's exports, a module
 * with only a default export that export, else the namespace. A namespace
 * with named exports and an object or function as default export (e.g.
 * chalk 5) stays the namespace, named exports first, but keys it lacks fall
 * through to the default export, so `recho.require("chalk").red` works.
 */
export function normalizeModule(module) {
  const keys = Object.keys(module);
  if (keys.includes("module.exports")) return module.default;
  if (keys.length === 1 && keys[0] === "default") return module.default;
  if (keys.includes("default") && isObject(module.default)) return withFallbacks(module, [module.default]);
  return module;
}

/** Modules merged into one: own keys as before, missing keys looked up in each module, in order. */
export function mergeModules(modules) {
  const normalized = modules.map(normalizeModule);
  const merged = Object.assign({}, ...normalized);
  return withFallbacks(merged, normalized.filter(isObject));
}

// Whether `value` is a chalk instance, by its shape: a numeric `level` next
// to chalk's `supportsColor` or `Chalk` (chalk 5) or `Instance` (chalk 4).
function isChalk(value) {
  return (
    isObject(value) &&
    typeof value.level === "number" &&
    ("supportsColor" in value || "Chalk" in value || "Instance" in value)
  );
}

/**
 * chalk guesses from its environment how many colours it may use: in the
 * browser from the user agent (only Chromium gets colour), in Node from the
 * terminal. Recho's output draws all colours anywhere, so a chalk instance
 * that guessed none is told so (truecolor, level 3).
 */
export function colorLevel(module) {
  if (!isChalk(module)) return module;
  // Set on the instance itself, not on a namespace wrapping it.
  const instance = isObject(module.default) && typeof module.default.level === "number" ? module.default : module;
  if (instance.level === 0) instance.level = 3;
  return module;
}
