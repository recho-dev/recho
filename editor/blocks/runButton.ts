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

const isRunButton = (event: Event) => event.target instanceof Element && !!event.target.closest(".cm-run-button");

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
      // Keep the editor from moving the cursor or selecting on any button.
      mousedown(view, line, event) {
        return isRunButton(event);
      },
      // A click is from the primary button, or Enter or Space on the focused
      // button.
      click(view, line, event) {
        if (!isRunButton(event)) return false;
        const blocks = blocksStartingOn(view, line);
        if (blocks.length) onRun(blocks.map((block) => block.source.from));
        return true;
      },
    },
  });
}
