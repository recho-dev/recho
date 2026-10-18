import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import {it, expect, describe, beforeAll, afterEach} from "vitest";
import {readFile} from "node:fs/promises";
import {EditorState} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {Parser, Language} from "web-tree-sitter";
import {mlscriptExtensions} from "../editor/languages/mlscript.js";
import {controlQuery, findControls} from "../editor/languages/mlscript/controls.js";

const grammarUrl = pathToFileURL(
  createRequire(import.meta.url).resolve("@mlscript/tree-sitter-mlscript/tree-sitter-mlscript.wasm"),
);
let language, querySource, parser, query;

beforeAll(async () => {
  await Parser.init();
  language = await Language.load(new Uint8Array(await readFile(grammarUrl)));
  querySource = await readFile(new URL("queries/highlights.scm", grammarUrl), "utf8");
  parser = new Parser();
  parser.setLanguage(language);
  query = controlQuery(language);
});

/** The controls of `doc`, with the text at their positions. */
function controls(doc) {
  const tree = parser.parse(doc);
  const result = findControls(query, tree);
  tree.delete();
  return result;
}

describe("finding MLscript controls", () => {
  it("finds toggles", () => {
    const doc = "let on = recho.toggle(true)\necho(recho.toggle(false))";
    expect(controls(doc)).toEqual([
      {control: "toggle", from: doc.indexOf("true"), checked: true},
      {control: "toggle", from: doc.indexOf("false"), checked: false},
    ]);
  });

  it("finds numbers and their options", () => {
    const doc = "let n = recho.number(12, {min: 0, max: 20, step: 2})";
    expect(controls(doc)).toEqual([
      {control: "number", from: 21, to: 23, value: 12, format: "decimal", min: 0, max: 20, step: 2},
    ]);
  });

  it("finds negative and decimal numbers", () => {
    const doc = "fun f() = recho.number(-3.5, {min: -10, step: 0.5})\nlet h = recho.number(0x1F)";
    const [a, b] = controls(doc);
    expect(doc.slice(a.from, a.to)).toBe("-3.5");
    expect(a).toMatchObject({value: -3.5, format: "real", min: -10, max: Infinity, step: 0.5});
    expect(doc.slice(b.from, b.to)).toBe("0x1F");
    expect(b).toMatchObject({value: 31, format: "hexadecimal"});
  });

  it("finds radios and where their options start", () => {
    const doc = 'let r = recho.radio(1, ["a", "b", "c"])';
    const [r] = controls(doc);
    expect(r).toMatchObject({control: "radio", from: 8, to: doc.length, selectedIndex: 1});
    expect(r.options.map((from) => doc[from + 1])).toEqual(["a", "b", "c"]);
  });

  it("skips other calls", () => {
    const doc = [
      "recho.inspect(1)",
      "other.toggle(true)",
      "recho.number(size + 1)",
      "recho.toggle(true, 1)",
      "recho.radio(1)",
      "recho.number(1_000)",
    ].join("\n");
    expect(controls(doc)).toEqual([]);
  });

  it("uses UTF-16 positions after non-ASCII text", () => {
    const doc = '// héllo 😀 中文\nlet r = recho.radio(0, ["é", "😀"])\nlet x = recho.number(-2)';
    const [r, n] = controls(doc);
    expect(r.options.map((from) => doc.slice(from, from + 3))).toEqual(['"é"', '"😀']);
    expect(doc.slice(n.from, n.to)).toBe("-2");
  });

  it("finds calls after a broken block", () => {
    const doc = "let b = (1 +\n\nlet on = recho.toggle(true)";
    expect(controls(doc)).toEqual([{control: "toggle", from: doc.indexOf("true"), checked: true}]);
  });
});

describe("MLscript control widgets", () => {
  let view, runs;

  function create(doc) {
    runs = 0;
    const runtimeRef = {current: {run: () => runs++}};
    view = new EditorView({
      state: EditorState.create({doc, extensions: mlscriptExtensions(language, querySource, runtimeRef)}),
      parent: document.body,
    });
    return view;
  }

  afterEach(() => view?.destroy());

  const mousedown = (target) => target.dispatchEvent(new MouseEvent("mousedown", {bubbles: true, cancelable: true}));

  it("toggles a boolean", () => {
    create("let on = recho.toggle(true)");
    const box = view.dom.querySelector(".cm-boolean-toggle input");
    expect(box.checked).toBe(true);
    mousedown(box);
    expect(view.state.doc.toString()).toBe("let on = recho.toggle(false)");
    expect(runs).toBe(1);
    expect(view.dom.querySelector(".cm-boolean-toggle input").checked).toBe(false);
  });

  it("steps a number within its options", () => {
    create("let n = recho.number(18, {min: 0, max: 20, step: 2})");
    const inc = () => view.dom.querySelector(".cm-number-btn.cm-number-inc");
    mousedown(inc());
    expect(view.state.doc.toString()).toBe("let n = recho.number(20, {min: 0, max: 20, step: 2})");
    // At the maximum.
    mousedown(inc());
    expect(view.state.doc.toString()).toBe("let n = recho.number(20, {min: 0, max: 20, step: 2})");
    expect(runs).toBe(1);
  });

  it("writes negative and decimal numbers", () => {
    create("let n = recho.number(0.5, {step: 1.5})");
    mousedown(view.dom.querySelector(".cm-number-btn.cm-number-dec"));
    expect(view.state.doc.toString()).toBe("let n = recho.number(-1, {step: 1.5})");
    mousedown(view.dom.querySelector(".cm-number-btn.cm-number-dec"));
    expect(view.state.doc.toString()).toBe("let n = recho.number(-2.5, {step: 1.5})");
    mousedown(view.dom.querySelector(".cm-number-btn.cm-number-inc"));
    expect(view.state.doc.toString()).toBe("let n = recho.number(-1, {step: 1.5})");
  });

  it("picks a radio option", () => {
    create('// 中文\nlet r = recho.radio(1, ["a", "b", "c"])');
    const radios = view.dom.querySelectorAll(".cm-radio-button input");
    expect([...radios].map((r) => r.checked)).toEqual([false, true, false]);
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event("change", {bubbles: true}));
    expect(view.state.doc.toString()).toBe('// 中文\nlet r = recho.radio(2, ["a", "b", "c"])');
    expect(runs).toBe(1);
  });

  it("keeps widgets while editing elsewhere and with a syntax error", () => {
    create("let on = recho.toggle(true)");
    view.dispatch({changes: {from: 0, insert: "let b = (1 +\n\n"}});
    view.dispatch({changes: {from: view.state.doc.length, insert: '\nlet r = recho.radio(0, ["x", "y"])'}});
    expect(view.dom.querySelectorAll(".cm-boolean-toggle input")).toHaveLength(1);
    expect(view.dom.querySelectorAll(".cm-radio-button input")).toHaveLength(2);
    mousedown(view.dom.querySelector(".cm-boolean-toggle input"));
    expect(view.state.doc.toString()).toBe(
      'let b = (1 +\n\nlet on = recho.toggle(false)\nlet r = recho.radio(0, ["x", "y"])',
    );
  });

  it("has no controls without a runtime", () => {
    view = new EditorView({
      state: EditorState.create({doc: "recho.toggle(true)", extensions: mlscriptExtensions(language, querySource)}),
      parent: document.body,
    });
    expect(view.dom.querySelector(".cm-boolean-toggle")).toBeNull();
  });
});

describe("MLscript comment links", () => {
  it("marks URLs in comments, not in strings", () => {
    const doc = '// See https://recho.dev/docs/mlscript-basics.\nlet s = "https://example.com"';
    const view = new EditorView({
      state: EditorState.create({doc, extensions: mlscriptExtensions(language, querySource)}),
      parent: document.body,
    });
    const links = [...view.dom.querySelectorAll(".cm-comment-link")];
    expect(links.map((link) => link.dataset.url)).toEqual(["https://recho.dev/docs/mlscript-basics"]);
    view.destroy();
  });
});
