import {require as browserRequire} from "d3-require";
import {parseSpecifier} from "./specifier.js";
import {colorLevel, mergeModules, normalizeModule} from "./modules.js";

const nodeImportCache = new Map();

function hasDocument() {
  return typeof document !== "undefined" && document.createElement && document.head;
}

function nodeImport(spec) {
  if (typeof spec !== "string") return Promise.resolve(spec);
  let module = nodeImportCache.get(spec);
  if (!module) {
    module = importInstalled(spec).then(normalizeModule).then(colorLevel);
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

// jsDelivr's ESM build of a package: `name@version/subpath/+esm`.
function esmURL(spec) {
  const {name, version, subpath} = parseSpecifier(spec);
  return `https://cdn.jsdelivr.net/npm/${name}@${version ?? "latest"}${subpath}/+esm`;
}

const esmCache = new Map();

// d3-require loads UMD and AMD scripts only. A package it can't load (e.g.
// one published only as ES modules, like chalk 5) is imported from jsDelivr's
// ESM endpoint instead; if that fails too, d3-require's error is the one shown.
function browserRequireOne(spec) {
  if (typeof spec !== "string" || /^https?:\/\//i.test(spec)) return browserRequire(spec).then(colorLevel);
  return browserRequire(spec).then(colorLevel, (error) => {
    let module = esmCache.get(spec);
    if (!module) {
      module = import(/* @vite-ignore */ /* webpackIgnore: true */ esmURL(spec)).then(normalizeModule);
      esmCache.set(spec, module);
      module.catch(() => esmCache.delete(spec));
    }
    return module.then(colorLevel, () => Promise.reject(error));
  });
}

export function require(...names) {
  if (hasDocument()) {
    if (names.length === 1) return browserRequireOne(names[0]);
    // Several at once load as before; only when one fails, one by one.
    return browserRequire(...names).then(colorLevel, () =>
      Promise.all(names.map(browserRequireOne)).then(mergeModules),
    );
  }
  return names.length > 1 ? Promise.all(names.map(nodeImport)).then(mergeModules) : nodeImport(names[0]);
}

export {now} from "./now.js";
export {interval} from "./interval.js";
export {inspect, Inspector} from "./inspect.js";
export * from "../controls/index.js";
export {state} from "./state.js";
