import {GutterMarker, gutter, type BlockInfo, type EditorView} from "@codemirror/view";
import {BlockMetadata} from "./BlockMetadata.ts";
import {blockMetadataField} from "./state.ts";

class RunButtonMarker extends GutterMarker {
  constructor(
    private visible: boolean,
    private count = 1,
  ) {
    super();
  }
  eq(other: RunButtonMarker) {
    return other.visible === this.visible && other.count === this.count;
  }
  toDOM() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-run-button";
    if (!this.visible) {
      // The spacer only keeps the gutter's width.
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

const spacer = new RunButtonMarker(false);
const runButtons = [spacer, new RunButtonMarker(true, 1)];
const runButton = (count: number) => (runButtons[count] ??= new RunButtonMarker(true, count));

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

const positionsOf = (blocks: BlockMetadata[]) => blocks.map((block) => block.source.from);

const runButtonOf = (event: Event) =>
  event.target instanceof Element ? event.target.closest<HTMLElement>(".cm-run-button") : null;

/**
 * A gutter with a play button on each line where a block's source starts,
 * which calls `onRun` with the positions of those blocks' sources.
 */
export function runButtonGutter(onRun: (positions: number[]) => void) {
  return gutter({
    class: "cm-runButtons",
    lineMarkerChange: (update) =>
      update.startState.field(blockMetadataField, false) !== update.state.field(blockMetadataField, false),
    lineMarker(view, line) {
      const count = blocksStartingOn(view, line).length;
      return count ? runButton(count) : null;
    },
    initialSpacer() {
      return spacer;
    },
    domEventHandlers: {
      // A press anywhere in the gutter, beside a line where blocks start, as
      // the button may not be under the pointer (see lineAtY). Handling it
      // also keeps the editor from moving the cursor.
      mousedown(view, _line, e) {
        const event = e as MouseEvent;
        if (event.button !== 0) return false;
        const line = lineAtY(view, event.clientY);
        const blocks = line ? blocksStartingOn(view, line) : [];
        if (blocks.length) onRun(positionsOf(blocks));
        return true;
      },
      // Enter or Space on the focused button. `line` is found from where the
      // button is, by the height map that places it, so they agree. (A
      // click from the mouse has already run on its press.)
      click(view, line, e) {
        const event = e as MouseEvent;
        if (!runButtonOf(event) || event.detail !== 0) return false;
        const blocks = blocksStartingOn(view, line);
        if (blocks.length) onRun(positionsOf(blocks));
        return true;
      },
    },
  });
}
