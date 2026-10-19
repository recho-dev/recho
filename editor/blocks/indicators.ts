import {GutterMarker, gutter} from "@codemirror/view";
import {BlockMetadata} from "./BlockMetadata.ts";
import {blockMetadataField} from "./state.ts";

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

// One continuous marker per output run: the output lines of a block (those
// before its source) get a marker, `head` and `tail` at the run's ends. The
// source lines get none.
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

    // Only the block's output lines, before its source, have a marker.
    const sourceFirstLine = view.state.doc.lineAt(block.source.from).number;
    if (currentLine >= sourceFirstLine) return null;
    const group = block.error ? indicatorMarkers.error : indicatorMarkers.output;

    // Determine the gutter marker to use.
    const outputFirstLine = view.state.doc.lineAt(block.from).number;
    const outputLastLine = sourceFirstLine - 1;
    if (outputFirstLine === currentLine) {
      return outputLastLine === currentLine ? group.sole : group.head;
    } else if (outputLastLine === currentLine) {
      return group.tail;
    } else {
      return group.body;
    }
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
