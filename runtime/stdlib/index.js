import {require as browserRequire} from "d3-require";
import {parseSpecifier} from "./specifier.js";

const nodeImportCache = new Map();

function hasDocument() {
  return typeof document !== "undefined" && document.createElement && document.head;
}

function normalizeModule(module) {
  const keys = Object.keys(module);
  if (keys.includes("module.exports")) return module.default;
  return keys.length === 1 && keys[0] === "default" ? module.default : module;
}

function mergeModules(modules) {
  const merged = {};
  for (const module of modules) {
    const normalized = normalizeModule(module);
    Object.assign(merged, normalized);
  }
  return merged;
}

function nodeImport(spec) {
  if (typeof spec !== "string") return Promise.resolve(spec);
  let module = nodeImportCache.get(spec);
  if (!module) {
    module = importInstalled(spec).then(normalizeModule);
    nodeImportCache.set(spec, module);
  }
  return module;
}

// Outside the browser there is no CDN: a specifier has to name a package
// installed alongside the notebook. A pinned `name@version/build/file.js`
// (the browser's CDN form) loads the installed package instead — first by
// its subpath, then by its entry point, since packages rarely export their
// build directory.
async function importInstalled(spec) {
  const {url, name, version, subpath} = parseSpecifier(spec);
  if (url) {
    throw new Error(
      `recho.require: ${spec} is a URL — outside the browser only npm packages installed with the notebook can be loaded`,
    );
  }
  const candidates = version && subpath ? [name + subpath, name] : [name + subpath];
  for (const candidate of candidates) {
    try {
      // Only runs outside the browser, on a specifier known at runtime, so
      // bundlers shouldn't try to resolve it.
      return await import(/* @vite-ignore */ /* webpackIgnore: true */ candidate);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND" && error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error;
    }
  }
  const pinned = version ? ` (the @${version} pin only applies in the browser)` : "";
  throw new Error(
    `recho.require: "${name}" isn't installed — outside the browser only npm packages installed with the notebook can be loaded${pinned}`,
  );
}

export function require(...names) {
  if (hasDocument()) return browserRequire(...names);
  return names.length > 1 ? Promise.all(names.map(nodeImport)).then(mergeModules) : nodeImport(names[0]);
}

export {now} from "./now.js";
export {interval} from "./interval.js";
export {inspect, Inspector} from "./inspect.js";
export * from "../controls/index.js";
export {state} from "./state.js";
