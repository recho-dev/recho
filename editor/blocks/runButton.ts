import {GutterMarker, gutter, type BlockInfo, type EditorView} from "@codemirror/view";
import {BlockMetadata} from "./BlockMetadata.ts";
import {blockMetadataField} from "./state.ts";

/** A play button for `count` blocks; with none, it only keeps the gutter's width. */
class RunButtonMarker extends GutterMarker {
  constructor(private count: number) {
    super();
  }
  eq(other: RunButtonMarker) {
    return other.count === this.count;
  }
  toDOM() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-run-button";
    if (!this.count) {
      button.style.visibility = "hidden";
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
      return button;
    }
    const label = this.count > 1 ? `Run ${this.count} cells` : "Run cell";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
    return button;
  }
}

const markers: RunButtonMarker[] = [];
const marker = (count: number) => (markers[count] ??= new RunButtonMarker(count));

/**
 * The blocks whose source starts on the given line. A block's source starts
 * at its first token, after the line's indentation, and a line can start
 * more than one block (e.g. `echo(1); echo(2)`).
 */
function blocksStartingOn(view: EditorView, line: BlockInfo): BlockMetadata[] {
  const blocks = view.state.field(blockMetadataField, false);
  if (blocks === undefined) return [];
  // The first block whose source starts at or after the line.
  let left = 0;
  let right = blocks.length;
  while (left < right) {
    const middle = (left + right) >>> 1;
    if (blocks[middle].source.from < line.from) left = middle + 1;
    else right = middle;
  }
  const starting = [];
  for (let i = left; i < blocks.length && blocks[i].source.from <= line.to; i++) starting.push(blocks[i]);
  return starting;
}

/**
 * The line drawn at `clientY`, from the content itself. The gutter is placed
 * from the editor's height map, which can be off for a moment: when output
 * changes (e.g. an animation), the editor first gives the new lines an
 * estimated height, then measures them before the next paint. A press in
 * between can miss the button, or land on the wrong line by the height map,
 * while the content is where it was drawn.
 */
function lineAtY(view: EditorView, clientY: number): BlockInfo | null {
  const content = view.contentDOM.getBoundingClientRect();
  const target = view.root.elementFromPoint(content.left + 1, clientY);
  const line = target?.closest(".cm-line");
  if (!line || !view.contentDOM.contains(line)) return null;
  return view.lineBlockAt(view.posAtDOM(line));
}

/**
 * A gutter with a play button on each line where a block's source starts,
 * which calls `onRun` with the positions of those blocks' sources.
 */
export function runButtonGutter(onRun: (positions: number[]) => void) {
  const runOn = (view: EditorView, line: BlockInfo | null) => {
    const blocks = line ? blocksStartingOn(view, line) : [];
    if (blocks.length) onRun(blocks.map((block) => block.source.from));
  };
  return gutter({
    class: "cm-runButtons",
    lineMarkerChange: (update) =>
      update.startState.field(blockMetadataField, false) !== update.state.field(blockMetadataField, false),
    lineMarker(view, line) {
      const count = blocksStartingOn(view, line).length;
      return count ? marker(count) : null;
    },
    initialSpacer: () => marker(0),
    domEventHandlers: {
      // A press anywhere in the gutter runs the blocks starting beside it,
      // as the button may not be under the pointer (see lineAtY). Handling
      // it also keeps the editor from moving the cursor.
      mousedown(view, _line, event) {
        if ((event as MouseEvent).button !== 0) return false;
        runOn(view, lineAtY(view, (event as MouseEvent).clientY));
        return true;
      },
      // Enter or Space on the focused button (a click from the mouse has
      // run on its press). `line` is found from where the button is, by the
      // height map that places it, so they agree.
      click(view, line, event) {
        const fromKeyboard = (event as MouseEvent).detail === 0;
        if (!fromKeyboard || !(event.target as Element).closest?.(".cm-run-button")) return false;
        runOn(view, line);
        return true;
      },
    },
  });
}
