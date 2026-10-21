import {it, expect} from "vitest";
import {EditorState} from "@codemirror/state";
import {lineNumberWidgetMarker} from "@codemirror/view";
import {javascript} from "@codemirror/lang-javascript";
import {ensureSyntaxTree} from "@codemirror/language";
import {outputDecoration, outputLines, outputWidgetField} from "../editor/blocks/output.ts";

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
