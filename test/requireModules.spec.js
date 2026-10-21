import {afterEach, it, expect, vi} from "vitest";
import {colorLevel, mergeModules, normalizeModule} from "../runtime/stdlib/modules.js";
import * as stdlib from "../runtime/stdlib/index.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

// A frozen object stands in for a module namespace.
const namespace = (exports) => Object.freeze({...exports});

it("keeps a namespace with a default export: .default and named exports", () => {
  const defaultExport = {a: "default a", b: "default b"};
  const module = normalizeModule(namespace({default: defaultExport, a: "named a"}));
  expect(module.default).toBe(defaultExport);
  expect(module.a).toBe("named a");
  expect(module.b).toBe("default b");
  expect(Object.keys(module).sort()).toEqual(["a", "default"]);
  expect(defaultExport).toEqual({a: "default a", b: "default b"});
});

it("returns a default-only module's default export, and other namespaces as is", () => {
  const value = () => 1;
  expect(normalizeModule(namespace({default: value}))).toBe(value);
  const named = namespace({x: 1});
  expect(normalizeModule(named)).toBe(named);
});

it("exposes chalk's styles from its namespace, and colours", async () => {
  vi.stubGlobal("document", undefined);
  const chalk = await stdlib.require("chalk");
  expect(typeof chalk.red).toBe("function");
  expect(typeof chalk.Chalk).toBe("function");
  expect(chalk.default.level).toBe(3);
  expect(chalk.red("x")).toBe("\x1b[31mx\x1b[39m");
});

it("exposes chalk's styles from a merged require", async () => {
  vi.stubGlobal("document", undefined);
  const merged = await stdlib.require("chalk", "d3-array");
  expect(merged.red("x")).toBe("\x1b[31mx\x1b[39m");
  expect(merged.range(3)).toEqual([0, 1, 2]);
});

it("falls back across merged modules only for missing keys", () => {
  const merged = mergeModules([namespace({a: 1}), namespace({default: {b: 2}, a: 3})]);
  expect(merged.a).toBe(3);
  expect(merged.b).toBe(2);
});

it("sets the colour level of chalk-shaped modules that guessed none", () => {
  const chalk4 = {level: 0, supportsColor: false, Instance: class {}};
  expect(colorLevel(chalk4).level).toBe(3);
  const other = {level: 0};
  expect(colorLevel(other).level).toBe(0);
});
