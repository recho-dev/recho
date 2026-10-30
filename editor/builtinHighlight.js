import {syntaxTree} from "@codemirror/language";
import {Decoration} from "@codemirror/view";
import {BUILTINS} from "../runtime/builtins.js";
import {syntaxMarks} from "./syntaxMarks.js";

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

export const builtinHighlight = syntaxMarks((state, from, to) =>
  builtinRanges(state, from, to).map((range) => builtinDeco.range(range.from, range.to)),
);
