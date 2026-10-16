import {Decoration, ViewPlugin, ViewUpdate, EditorView, type DecorationSet} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {Facet, StateField, RangeSetBuilder, type EditorState} from "@codemirror/state";
import {markLineType} from "../../lib/blocks/detect.ts";

export type OutputLine = {
  from: number;
  type: "output" | "error";
};

function computeLineNumbers(state: EditorState): OutputLine[] {
  const lineNumbers: OutputLine[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== "LineComment") return;

      // The comment must cover the entire line.
      const line = state.doc.lineAt(node.from);
      if (line.from !== node.from || line.to !== node.to) return;

      const type = markLineType(line.text);
      if (type === null) return;

      // Output lines must be top-level; for error messages, it's Ok if the
      // line is not top-level.
      if (type === "output" && node.node.parent?.name !== "Script") return;

      lineNumbers.push({from: line.from, type});
    },
  });
  return lineNumbers;
}

export type OutputLineFinder = (state: EditorState) => OutputLine[];

/**
 * How output lines are found. By default, as top-level `//➜` and `//✗`
 * comments in the JavaScript syntax tree; other languages provide their own.
 */
export const outputLineFinder = Facet.define<OutputLineFinder, OutputLineFinder>({
  combine: (values) => values[0] ?? computeLineNumbers,
});

export const outputLinesField = StateField.define<OutputLine[]>({
  create(state) {
    return state.facet(outputLineFinder)(state);
  },
  update(value, tr) {
    return tr.docChanged ? tr.state.facet(outputLineFinder)(tr.state) : value;
  },
});

export const outputLines = outputLinesField.extension;

const highlight = Decoration.line({attributes: {class: "cm-output-line"}});
const errorHighlight = Decoration.line({attributes: {class: "cm-output-line cm-error-line"}});

export const outputDecoration = ViewPlugin.fromClass(
  class {
    #decorations: DecorationSet;

    get decorations() {
      return this.#decorations;
    }

    constructor(view: EditorView) {
      const outputLines = view.state.field(outputLinesField);
      this.#decorations = this.createDecorations(outputLines);
    }

    update(update: ViewUpdate) {
      const newOutputLines = update.state.field(outputLinesField);
      // A possible optimization would be to only update the changed lines.
      this.#decorations = this.createDecorations(newOutputLines);
    }

    createDecorations(lines: OutputLine[]) {
      const builder = new RangeSetBuilder<Decoration>();
      // Add output line decorations
      for (const {from, type} of lines) {
        if (type === "output") builder.add(from, from, highlight);
        else if (type === "error") builder.add(from, from, errorHighlight);
      }
      return builder.finish();
    }
  },
  {decorations: (v) => v.decorations},
);
