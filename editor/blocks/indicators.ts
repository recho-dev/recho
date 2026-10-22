import {GutterMarker, gutter} from "@codemirror/view";
import {BlockMetadata} from "./BlockMetadata.ts";
import {blockMetadataField} from "./state.ts";
import {OutputWidget} from "./output.ts";

export class BlockIndicator extends GutterMarker {
  constructor(private className: string) {
    super();
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = this.className;
    return div;
  }
}

// One continuous marker per run, `head` and `tail` at its ends. A block that
// ran marks its output lines (those before its source) as succeeded; a block
// that failed is marked as failed from its first line to its last, so the
// failure shows even with no output. Source lines of a block that ran get none.
const markers = (kind: string) => ({
  head: new BlockIndicator(`cm-block-indicator ${kind} head`),
  tail: new BlockIndicator(`cm-block-indicator ${kind} tail`),
  sole: new BlockIndicator(`cm-block-indicator ${kind} head tail`),
  body: new BlockIndicator(`cm-block-indicator ${kind}`),
});

const indicatorMarkers = {output: markers("output"), error: markers("error")};
const spacer = new BlockIndicator("cm-block-indicator");

export const blockIndicator = gutter({
  class: "cm-blockIndicators",
  // Repaint when the blocks change, even if the text didn't (e.g. a re-run
  // that only flips a block's error state).
  lineMarkerChange: (update) =>
    update.startState.field(blockMetadataField, false) !== update.state.field(blockMetadataField, false),
  /**
   * Create a gutter marker for the given line.
   *
   * @param view the editor view
   * @param line a record used to represent information about a block-level element
   * in the editor view.
   * @returns a gutter marker for the line
   */
  lineMarker(view, line) {
    // Get the block metadata from the state.
    const blocks = view.state.field(blockMetadataField, false);
    if (blocks === undefined) return null;

    // Find the block that contains the given line.
    const index = findEnclosingBlock(blocks, line.from);
    if (index === null) return null;

    // Get the current line number.
    const block = blocks[index];
    const currentLine = view.state.doc.lineAt(line.from).number;

    // The run: the whole block if it failed, else its output lines.
    const sourceFirstLine = view.state.doc.lineAt(block.source.from).number;
    const runFirstLine = view.state.doc.lineAt(block.from).number;
    const runLastLine = block.error ? view.state.doc.lineAt(block.to).number : sourceFirstLine - 1;
    if (currentLine > runLastLine) return null;
    const group = block.error ? indicatorMarkers.error : indicatorMarkers.output;

    // Determine the gutter marker to use.
    if (runFirstLine === currentLine) {
      return runLastLine === currentLine ? group.sole : group.head;
    } else if (runLastLine === currentLine) {
      return group.tail;
    } else {
      return group.body;
    }
  },
  // An output widget (see ./output.ts) is one gutter element as high as its
  // rows, so it gets one marker, rounded at both ends, when it is a block's
  // output.
  widgetMarker(view, widget, block) {
    if (!(widget instanceof OutputWidget)) return null;
    const blocks = view.state.field(blockMetadataField, false);
    if (blocks === undefined) return null;
    const index = findEnclosingBlock(blocks, block.from);
    if (index === null || block.from >= blocks[index].source.from) return null;
    return blocks[index].error ? indicatorMarkers.error.sole : indicatorMarkers.output.sole;
  },
  initialSpacer() {
    return spacer;
  },
});

function findEnclosingBlock(blocks: BlockMetadata[], pos: number): number | null {
  let left = 0;
  let right = blocks.length - 1;

  while (left <= right) {
    const middle = (left + right) >>> 1;
    const pivot = blocks[middle];
    if (pos < pivot.from) {
      right = middle - 1;
    } else if (pos >= pivot.to) {
      // The right boundary `to` is exclusive, matching `findAdjacentBlocks`.
      left = middle + 1;
    } else {
      return middle;
    }
  }

  return null;
}
