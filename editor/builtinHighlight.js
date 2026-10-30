import {syntaxTree} from "@codemirror/language";
import {Decoration, ViewPlugin} from "@codemirror/view";
import {BUILTINS} from "../runtime/builtins.js";

const builtinDeco = Decoration.mark({class: "cm-recho-builtin"});

/**
 * The ranges of built-in names read between `from` and `to`. Only variable
 * references count: `obj.echo` is a property and `const echo` a definition.
 */
export function builtinRanges(state, from = 0, to = state.doc.length) {
  const ranges = [];
  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      if (node.name === "VariableName" && BUILTINS.has(state.doc.sliceString(node.from, node.to))) {
        ranges.push({from: node.from, to: node.to});
      }
    },
  });
  return ranges;
}

function buildDecorations(view) {
  const decorations = [];
  for (const {from, to} of view.visibleRanges) {
    for (const range of builtinRanges(view.state, from, to)) {
      decorations.push(builtinDeco.range(range.from, range.to));
    }
  }
  return Decoration.set(decorations, true);
}

export const builtinHighlight = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }

    update(update) {
      // The tree also changes when the parser catches up after an edit.
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {decorations: (v) => v.decorations},
);
