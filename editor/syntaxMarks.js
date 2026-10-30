import {syntaxTree} from "@codemirror/language";
import {Decoration, ViewPlugin} from "@codemirror/view";

/**
 * A plugin that marks the visible code, from `collect(state, from, to)`
 * giving the marks (decoration ranges) for each visible range. It redoes
 * them when the code, the view or the syntax tree changes; the tree also
 * changes when the parser catches up after an edit.
 */
export function syntaxMarks(collect) {
  const build = (view) =>
    Decoration.set(
      view.visibleRanges.flatMap(({from, to}) => collect(view.state, from, to)),
      true,
    );

  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }

      update(update) {
        if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
          this.decorations = build(update.view);
        }
      }
    },
    {decorations: (v) => v.decorations},
  );
}
