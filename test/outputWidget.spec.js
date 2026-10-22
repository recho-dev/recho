import {it, expect} from "vitest";
import {EditorState} from "@codemirror/state";
import {EditorView, lineNumberWidgetMarker} from "@codemirror/view";
import {javascript} from "@codemirror/lang-javascript";
import {ensureSyntaxTree} from "@codemirror/language";
import {outputDecoration, outputLines, outputWidgetField} from "../editor/blocks/output.ts";
import {blockIndicator} from "../editor/blocks/indicators.ts";
import {blockMetadataEffect} from "../editor/blocks/effect.ts";
import {blockMetadataField} from "../editor/blocks/state.ts";
import {BlockMetadata} from "../editor/blocks/BlockMetadata.ts";

function numbers(state) {
  ensureSyntaxTree(state, state.doc.length, 5000);
  const [marker] = state.facet(lineNumberWidgetMarker);
  const result = [];
  state.field(outputWidgetField).between(0, state.doc.length, (from, _to, decoration) => {
    const numbers = marker({state}, decoration.spec.widget, {from});
    result.push(Array.from(numbers.toDOM().children, (div) => div.textContent));
  });
  return result;
}

it("numbers output rows by where the widget is, after lines are inserted above", () => {
  let state = EditorState.create({
    doc: "const a = 1;\n\n//➜ 1\n//➜ 2\necho(a);\n",
    extensions: [javascript(), outputLines, outputDecoration],
  });
  expect(numbers(state)).toEqual([["3", "4"]]);
  const widget = () => state.field(outputWidgetField).iter().value.spec.widget;
  const before = widget();
  state = state.update({changes: {from: 0, insert: "// new\n"}}).state;
  // The output is unchanged, so the widget compares equal and keeps its DOM…
  expect(widget().eq(before)).toBe(true);
  // …but its numbers move down.
  expect(numbers(state)).toEqual([["4", "5"]]);
});

it("marks a failed block's output widget as the start of a run through its source", () => {
  const doc = "//➜ 1\n//➜ 2\necho(a);\n";
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [javascript(), outputLines, outputDecoration, blockMetadataField, blockIndicator],
    }),
    parent: document.body,
  });
  const source = {from: doc.indexOf("echo"), to: doc.length - 1};
  const block = (error) => new BlockMetadata("a", "", {from: 0, to: source.from}, source, {}, error);
  // The markers drawn, top to bottom.
  const markers = () =>
    [...view.dom.querySelectorAll(".cm-blockIndicators .cm-block-indicator.output, .cm-block-indicator.error")].map(
      (element) => element.className.replace("cm-block-indicator ", ""),
    );

  view.dispatch({effects: blockMetadataEffect.of([block(false)])});
  expect(markers()).toEqual(["output head tail"]);
  view.dispatch({effects: blockMetadataEffect.of([block(true)])});
  expect(markers()).toEqual(["error head", "error tail"]);
  view.destroy();
});
