import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import {it, expect, describe, beforeAll} from "vitest";
import {readFile} from "node:fs/promises";
import {EditorState} from "@codemirror/state";
import {CompletionContext} from "@codemirror/autocomplete";
import {Parser, Language} from "web-tree-sitter";
import {mlscriptExtensions} from "../editor/languages/mlscript.js";
import {RECHO_MEMBERS, STD_MODULES} from "../editor/languages/mlscript/completion.js";

const require = createRequire(import.meta.url);
const grammarUrl = pathToFileURL(require.resolve("@mlscript/tree-sitter-mlscript/tree-sitter-mlscript.wasm"));
let language, querySource, parser;

beforeAll(async () => {
  await Parser.init();
  language = await Language.load(new Uint8Array(await readFile(grammarUrl)));
  querySource = await readFile(new URL("queries/highlights.scm", grammarUrl), "utf8");
  parser = new Parser();
  parser.setLanguage(language);
});

/**
 * The completion result at the `§` in `doc`, through the editor's language
 * data (as `autocompletion()` finds the source).
 */
function complete(doc, {explicit = false} = {}) {
  const pos = doc.indexOf("§");
  const state = EditorState.create({
    doc: doc.slice(0, pos) + doc.slice(pos + 1),
    extensions: mlscriptExtensions(language, querySource),
  });
  const sources = state.languageDataAt("autocomplete", pos);
  expect(sources).toHaveLength(1);
  const result = sources[0](new CompletionContext(state, pos, explicit));
  return result;
}

const labels = (result) => result?.options.map((o) => o.label) ?? [];
const option = (result, label) => result?.options.find((o) => o.label === label);

/** Applies a completion's `apply` function to a fake view, giving the new doc and cursor. */
function applied(doc, completion, from, to) {
  let out;
  completion.apply(
    {
      dispatch({changes, selection}) {
        out = {
          doc: doc.slice(0, changes.from) + changes.insert + doc.slice(changes.to),
          cursor: selection.anchor,
        };
      },
    },
    completion,
    from,
    to,
  );
  return out;
}

describe("MLscript completion", () => {
  it("offers names defined in the notebook", () => {
    const doc = [
      "fun area(r) = r * r",
      "data class Circle(r: Num)",
      "class Point(val x: Int) with",
      "  fun norm = x",
      "module Geo with",
      "  val pi = 3.14",
      "object Nil",
      "type Shape = Circle | Point",
      "let (a, b) = (1, 2)",
      "val v = 1",
      "pattern Zero = 0",
      "fun id[A](x: A): A = x",
      "let total = ar§",
    ].join("\n");
    const result = complete(doc);
    expect(result.from).toBe(doc.indexOf("ar§"));
    expect(option(result, "area")).toMatchObject({type: "function"});
    expect(option(result, "Circle")).toMatchObject({type: "class"});
    expect(option(result, "Point")).toMatchObject({type: "class"});
    expect(option(result, "Geo")).toMatchObject({type: "namespace"});
    expect(option(result, "Nil")).toMatchObject({type: "class"});
    expect(option(result, "Shape")).toMatchObject({type: "type"});
    expect(option(result, "Zero")).toMatchObject({type: "type"});
    expect(option(result, "a")).toMatchObject({type: "variable"});
    expect(option(result, "b")).toMatchObject({type: "variable"});
    expect(option(result, "v")).toMatchObject({type: "variable"});
    expect(option(result, "id")).toMatchObject({type: "function"});
    // Not the binding being typed, nor members or parameters elsewhere.
    expect(labels(result)).not.toContain("total");
    expect(labels(result)).not.toContain("norm");
    expect(labels(result)).not.toContain("pi");
    expect(labels(result)).not.toContain("r");
  });

  it("doesn't offer the name being typed", () => {
    expect(labels(complete("fun are§"))).not.toContain("are");
    expect(labels(complete("class Fo§"))).not.toContain("Fo");
  });

  it("offers the parameters of enclosing functions", () => {
    expect(labels(complete("fun f(width) = wi§"))).toContain("width");
    expect(labels(complete("fun f(x)(y: Int) = x + §", {explicit: true}))).toEqual(
      expect.arrayContaining(["x", "y", "f"]),
    );
    expect(labels(complete("fun f(width) = 1\nlet g = wi§"))).not.toContain("width");
    expect(labels(complete("let g = [1].map(item => it§)"))).toContain("item");
  });

  it("offers the lets of enclosing blocks before the cursor", () => {
    const doc = "fun f(width) =\n  let a = 1\n  fun helper = 2\n  §\n  let b = 2";
    const result = labels(complete(doc, {explicit: true}));
    expect(result).toEqual(expect.arrayContaining(["width", "a", "helper", "f"]));
    expect(result).not.toContain("b");
    expect(labels(complete("fun f() =\n  let total = to§"))).not.toContain("total");
  });

  it("tolerates a broken parse around the cursor", () => {
    const result = labels(complete("fun f(width) =\n  let a = (wi§"));
    expect(result).toContain("width");
    expect(labels(complete("fun area(r) = r\necho(ar§"))).toContain("area");
  });

  it("offers the members of the notebook's modules and objects, not of classes", () => {
    const doc = "module Point with\n  fun origin = 0\n  val unit = 1\n  let hidden = 2\nlet p = Point.§";
    const result = complete(doc);
    expect(result.from).toBe(doc.length - 1);
    expect(labels(result)).toEqual(["origin", "unit", "hidden"]);
    const prefixed = complete("object O with\n  fun norm = 1\nO.no§");
    expect(prefixed.from).toBe("object O with\n  fun norm = 1\nO.".length);
    expect(labels(prefixed)).toEqual(["norm"]);
    // A class's methods and `val` parameters belong to its instances.
    expect(complete("class C(val x: Int) with\n  fun norm = x\nC.no§")).toBeNull();
    const companion = "class P(val x: Int) with\n  fun norm = x\nmodule P with\n  fun origin = P(0)\nP.§";
    expect(labels(complete(companion))).toEqual(["origin"]);
    expect(complete("let q = Unknown.§")).toBeNull();
  });

  it("offers recho's functions with MLscript templates", () => {
    const doc = "let n = recho.§";
    const result = complete(doc);
    expect(labels(result)).toEqual([
      "toggle",
      "number",
      "radio",
      "button",
      "interval",
      "now",
      "state",
      "inspect",
      "require",
    ]);
    const from = result.from;
    const base = doc.replace("§", "");
    expect(applied(base, option(result, "number"), from, from)).toEqual({
      doc: "let n = recho.number(, {min: 0, max: 10})",
      cursor: base.length + "number(".length,
    });
    expect(applied(base, option(result, "radio"), from, from).doc).toBe("let n = recho.radio(, [])");
  });

  it("inserts templates that parse", () => {
    for (const completion of RECHO_MEMBERS) {
      const {doc, cursor} = applied("let x = recho.", completion, 14, 14);
      // Fill in the hole at the cursor, if any.
      const hole =
        cursor === doc.length ? "" : doc[cursor - 1] === '"' ? "a" : completion.label === "toggle" ? "true" : "0";
      const filled = doc.slice(0, cursor) + hole + doc.slice(cursor);
      const tree = parser.parse(filled);
      expect(tree.rootNode.hasError, filled).toBe(false);
      tree.delete();
    }
  });

  it("offers keywords and echo", () => {
    const result = complete("ec§");
    expect(option(result, "echo")).toMatchObject({type: "function"});
    expect(option(result, "recho")).toMatchObject({type: "namespace"});
    expect(labels(result)).toEqual(expect.arrayContaining(["let", "fun", "class", "if", "then", "is", "true"]));
    expect(option(result, "let")).toMatchObject({type: "keyword"});
  });

  it("offers nothing in comments, strings, numbers or with nothing typed", () => {
    expect(complete("fun area = 1\n// ar§")).toBeNull();
    expect(complete("fun area = 1\n/* ar§ */")).toBeNull();
    expect(complete('fun area = 1\nlet s = "ar§"')).toBeNull();
    expect(complete('fun area = 1\nlet s = "ar§')).toBeNull();
    expect(complete("let x = 1\n//➜ ar§")).toBeNull();
    expect(complete("let x = 1e§")).toBeNull();
    expect(complete("let x = 1 + §")).toBeNull();
    expect(complete("let x = /* c */ ar§")).not.toBeNull();
  });

  it("offers the standard library modules in import strings", () => {
    const open = complete('import "std/§');
    expect(open.from).toBe('import "'.length);
    expect(labels(open)).toContain("std/Option.mls");
    expect(option(open, "std/Option.mls")).toMatchObject({type: "namespace", apply: 'std/Option.mls"'});
    const closed = complete('import "std/Op§"');
    expect(closed.from).toBe('import "'.length);
    expect(option(closed, "std/Option.mls").apply).toBe("std/Option.mls");
    expect(labels(complete('import "§'))).toContain("std/Iter.mls");
  });

  it("lists the importable modules of @mlscript/recho", async () => {
    const url = pathToFileURL(`${process.cwd()}/node_modules/@mlscript/recho/dist/std-modules.mjs`);
    const {default: modules} = await import(url.href);
    const internal = ["Runtime", "RuntimeJS", "Predef"];
    const expected = Object.keys(modules)
      .map((file) => file.replace(/\.mjs$/, ""))
      .filter((name) => !internal.includes(name));
    expect([...STD_MODULES].sort()).toEqual(expected.sort());
  });
});
