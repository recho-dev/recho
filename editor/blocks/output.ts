import {Decoration, ViewPlugin, ViewUpdate, EditorView, type DecorationSet} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {Facet, StateField, RangeSetBuilder, type EditorState} from "@codemirror/state";
import {markLineType} from "../../lib/blocks/detect.ts";

export type OutputLine = {
  from: number;
  type: "output" | "error" | "warning";
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
const artHighlight = Decoration.line({attributes: {class: "cm-output-line cm-art-line"}});
const errorHighlight = Decoration.line({attributes: {class: "cm-output-line cm-error-line"}});
const warningHighlight = Decoration.line({attributes: {class: "cm-output-line cm-warning-line"}});
// The `//➜` (or `//✗`) at the start of a line, quieter than the output after it.
const prefixMark = Decoration.mark({class: "cm-output-line-prefix"});

// Box drawing and block elements: a run of output with them is ASCII art.
const ART = /[\u2500-\u259F]/;
// The marks that end an output line's prefix, e.g. `//➜` or wenyan's `批曰。「「➜`.
const PREFIX_END = /^.{0,8}?[➜✗]/u;

export const outputDecoration = ViewPlugin.fromClass(
  class {
    #decorations: DecorationSet;

    get decorations() {
      return this.#decorations;
    }

    constructor(view: EditorView) {
      const outputLines = view.state.field(outputLinesField);
      this.#decorations = this.createDecorations(outputLines, view.state);
    }

    update(update: ViewUpdate) {
      // The output lines only change with the document (see outputLinesField).
      const newOutputLines = update.state.field(outputLinesField);
      if (!update.docChanged && newOutputLines === update.startState.field(outputLinesField)) return;
      // A possible optimization would be to only update the changed lines.
      this.#decorations = this.createDecorations(newOutputLines, update.state);
    }

    createDecorations(lines: OutputLine[], state: EditorState) {
      const builder = new RangeSetBuilder<Decoration>();
      const {doc} = state;
      // Runs of output on consecutive lines with box drawing are set as art.
      const art = new Set<number>();
      for (let i = 0; i < lines.length; ) {
        let j = i + 1;
        while (j < lines.length && doc.lineAt(lines[j].from).number === doc.lineAt(lines[j - 1].from).number + 1) j++;
        const run = lines.slice(i, j).filter(({type}) => type === "output");
        if (run.some(({from}) => ART.test(doc.lineAt(from).text))) run.forEach(({from}) => art.add(from));
        i = j;
      }
      for (const {from, type} of lines) {
        if (type === "output") builder.add(from, from, art.has(from) ? artHighlight : highlight);
        else if (type === "error") builder.add(from, from, errorHighlight);
        else if (type === "warning") builder.add(from, from, warningHighlight);
        const prefix = doc.lineAt(from).text.match(PREFIX_END);
        if (prefix) builder.add(from, from + prefix[0].length, prefixMark);
      }
      return builder.finish();
    }
  },
  {decorations: (v) => v.decorations},
);
