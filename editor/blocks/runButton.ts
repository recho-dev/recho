import {GutterMarker, gutter, type BlockInfo, type EditorView} from "@codemirror/view";
import {BlockMetadata} from "./BlockMetadata.ts";
import {findEnclosingBlock} from "./indicators.ts";
import {blockMetadataField} from "./state.ts";

class RunButtonMarker extends GutterMarker {
  constructor(private visible: boolean) {
    super();
  }
  eq(other: RunButtonMarker) {
    return other.visible === this.visible;
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-run-button";
    if (!this.visible) {
      // The spacer only keeps the gutter's width.
      div.style.visibility = "hidden";
      return div;
    }
    div.title = "Run cell";
    div.setAttribute("role", "button");
    div.setAttribute("aria-label", "Run cell");
    div.innerHTML =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
    return div;
  }
}

const runButton = new RunButtonMarker(true);
const spacer = new RunButtonMarker(false);

/** The block whose source starts on the given line, if any. */
function blockStartingAt(view: EditorView, line: BlockInfo): BlockMetadata | null {
  const blocks = view.state.field(blockMetadataField, false);
  if (blocks === undefined) return null;
  const index = findEnclosingBlock(blocks, line.from);
  if (index === null) return null;
  const block = blocks[index];
  return view.state.doc.lineAt(block.source.from).from === line.from ? block : null;
}

/**
 * A gutter with a play button on the first source line of each block, which
 * calls `onRun` with the position of the block's source.
 */
export function runButtonGutter(onRun: (pos: number) => void) {
  return gutter({
    class: "cm-runButtons",
    lineMarkerChange: (update) =>
      update.startState.field(blockMetadataField, false) !== update.state.field(blockMetadataField, false),
    lineMarker(view, line) {
      return blockStartingAt(view, line) ? runButton : null;
    },
    initialSpacer() {
      return spacer;
    },
    domEventHandlers: {
      mousedown(view, line, event) {
        if (!(event.target instanceof Element) || !event.target.closest(".cm-run-button")) return false;
        const block = blockStartingAt(view, line);
        if (!block) return false;
        event.preventDefault();
        onRun(block.source.from);
        return true;
      },
    },
  });
}
