import {it, expect, vi, afterEach} from "vitest";
import {EditorState, EditorSelection} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {javascript} from "@codemirror/lang-javascript";
import {ensureSyntaxTree, syntaxTree} from "@codemirror/language";
import {cursorCharLeft, deleteCharBackward} from "@codemirror/commands";
import {outputDecoration, outputLines, outputLinesField} from "../editor/blocks/output.ts";
import {blockIndicator} from "../editor/blocks/indicators.ts";
import {blockMetadataEffect} from "../editor/blocks/effect.ts";
import {blockMetadataField} from "../editor/blocks/state.ts";
import {BlockMetadata} from "../editor/blocks/BlockMetadata.ts";

let view;
afterEach(() => view?.destroy());

function createView(doc, extensions = []) {
  const state = EditorState.create({doc, extensions: [javascript(), outputLines, outputDecoration, ...extensions]});
  ensureSyntaxTree(state, state.doc.length, 5000);
  view = new EditorView({state, parent: document.body});
  return view;
}

it("styles output lines in place, with the escapes hidden", () => {
  createView("echo(a);\n//➜ \x1b[31mred\x1b[39m plain\n//✗ oops\n");
  const [output, error] = view.contentDOM.querySelectorAll(".cm-output-line");
  expect(output.className).toBe("cm-line cm-output-line");
  expect(error.className).toBe("cm-line cm-output-line cm-error-line");
  // The text shows without escapes; the prefix and the red run have their spans.
  expect(output.textContent).toBe("//➜ red plain");
  expect(output.querySelector(".cm-output-line-prefix").textContent).toBe("//➜");
  const red = [...output.querySelectorAll("span[style]")].find((span) => span.textContent === "red");
  expect(red.style.color).toBe("var(--ansi-red)");
});

it("sets runs of output with box drawing as art", () => {
  createView("//➜ ┌─┐\n//➜ └─┘\necho(a);\n");
  const lines = [...view.contentDOM.querySelectorAll(".cm-output-line")];
  expect(lines.map((line) => line.classList.contains("cm-art-line"))).toEqual([true, true]);
});

it("keeps output as text, so part of it can be selected and deleted", () => {
  createView("//➜ @\n//➜ @@\n//➜ @@@\nbars(x);\n");
  const second = view.state.doc.line(2);
  const third = view.state.doc.line(3);
  // Select from the middle of line 2 to the end of line 3, as a drag would.
  view.dispatch({selection: EditorSelection.range(second.from + 5, third.to)});
  deleteCharBackward(view);
  expect(view.state.doc.toString()).toBe("//➜ @\n//➜ @\nbars(x);\n");
});

it("ends a selection at the line's end when only escapes follow it", () => {
  createView("//➜ \x1b[31m@\x1b[39m\n//➜ \x1b[32m@\x1b[39m\n{\n}\n");
  const second = view.state.doc.line(2);
  const beforeReset = second.to - "\x1b[39m".length;
  // Where a drag past the end of the line stops: before the hidden reset.
  view.dispatch({selection: EditorSelection.range(0, beforeReset)});
  expect(view.state.selection.main.to).toBe(second.to);
  deleteCharBackward(view);
  expect(view.state.doc.toString()).toBe("\n{\n}\n");
  // Backwards too, and not when visible text follows.
  view.dispatch({changes: {from: 0, insert: "//➜ \x1b[31m@\x1b[39m"}});
  const line = view.state.doc.line(1);
  view.dispatch({selection: EditorSelection.range(line.to - 5, 0)});
  expect(view.state.selection.main.anchor).toBe(line.to);
  view.dispatch({selection: EditorSelection.range(0, line.to - 6)});
  expect(view.state.selection.main.to).toBe(line.to - 6);
});

it("steps over an escape in one move", () => {
  createView("//➜ \x1b[31mred\x1b[39m\n");
  const line = view.state.doc.line(1);
  // After "red", before the hidden reset.
  const afterRed = line.text.indexOf("\x1b[39m");
  view.dispatch({selection: {anchor: line.to}});
  cursorCharLeft(view);
  expect(view.state.selection.main.head).toBe(afterRed);
  cursorCharLeft(view);
  expect(view.state.selection.main.head).toBe(afterRed - 1);
});

it("draws a line dense with colour in a widget that is selected and deleted as a whole", () => {
  const dense = Array.from({length: 20}, (_, i) => `\x1b[38;5;${i + 16}m#`).join("") + "\x1b[39m";
  createView(`//➜ ${dense}\n//➜ \x1b[31mred\x1b[39m\nbars(x);\n`);
  const [first, second] = view.contentDOM.querySelectorAll(".cm-output-line");
  // The dense line's text, after its prefix, is in a widget without escapes.
  expect(first.querySelector(".cm-output-dense").textContent).toBe(" " + "#".repeat(20));
  expect(first.querySelector(".cm-output-line-prefix").textContent).toBe("//➜");
  // A sparse line stays editable text.
  expect(second.querySelector(".cm-output-dense")).toBe(null);
  // Backspace at the end of the dense line removes its text in one go.
  view.dispatch({selection: {anchor: view.state.doc.line(1).to}});
  deleteCharBackward(view);
  expect(view.state.doc.line(1).text).toBe("//➜");
});

it("marks a block's output lines, then its source, as one run", () => {
  const doc = "//➜ 1\n//➜ 2\necho(a);\n";
  createView(doc, [blockMetadataField, blockIndicator]);
  const source = {from: doc.indexOf("echo"), to: doc.length - 1};
  const block = (error) => new BlockMetadata("a", "", {from: 0, to: source.from}, source, {}, error);
  // The markers drawn, top to bottom.
  const markers = () =>
    [...view.dom.querySelectorAll(".cm-blockIndicators .cm-block-indicator:is(.output, .source, .error)")].map(
      (element) => element.className.replace("cm-block-indicator ", ""),
    );

  view.dispatch({effects: blockMetadataEffect.of([block(false)])});
  expect(markers()).toEqual(["output head", "output", "source tail"]);
  view.dispatch({effects: blockMetadataEffect.of([block(true)])});
  expect(markers()).toEqual(["error head", "error", "error tail"]);
});

it("finds output past a partial syntax tree once the parser finishes", () => {
  // Frozen, so the parse stops only at the initial parse viewport (3000
  // characters), on every machine.
  vi.spyOn(Date, "now").mockReturnValue(Date.now());
  const code = Array.from({length: 300}, (_, i) => `const v${i} = ${i};`).join("\n");
  const state = EditorState.create({
    doc: `${code}\n//➜ \x1b[31mred\x1b[39m\necho(v0);\n`,
    extensions: [javascript(), outputLines],
  });
  const found = (state) => state.field(outputLinesField).map(({from}) => from);
  expect(syntaxTree(state).length).toBeLessThan(state.doc.length);
  expect(found(state)).toEqual([]);
  // The background parser finishes and dispatches a transaction with the
  // complete tree and no document change.
  ensureSyntaxTree(state, state.doc.length, 1e9);
  const done = state.update({}).state;
  expect(found(done)).toEqual([code.length + 1]);
  vi.restoreAllMocks();
});
