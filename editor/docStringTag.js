import {syntaxTree} from "@codemirror/language";
import {Decoration} from "@codemirror/view";
import {syntaxMarks} from "./syntaxMarks.js";

const docTagDeco = Decoration.mark({class: "cm-doc-tag"});

// A tag needs space before and after it, but doesn't have to start the line.
const TAG_RE = /\s+(@[a-zA-Z_]+)\s+/g;

/** Marks doc tags (`@param`, ...) in block comments. */
export const docStringTag = syntaxMarks((state, from, to) => {
  const marks = [];
  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      if (node.name !== "BlockComment") return;
      const text = state.doc.sliceString(node.from, node.to);
      for (const m of text.matchAll(TAG_RE)) {
        const start = node.from + m.index;
        marks.push(docTagDeco.range(start, start + m[0].length));
      }
    },
  });
  return marks;
});
