import {Facet, StateField, type Transaction} from "@codemirror/state";
import {BlockMetadata} from "./BlockMetadata.ts";
import {blockMetadataEffect} from "./effect.ts";
import {updateBlocks} from "./update.ts";

export type BlockUpdate = (blocks: BlockMetadata[], tr: Transaction) => BlockMetadata[];

/**
 * How blocks follow a user edit. By default they are re-detected from the
 * JavaScript syntax tree (updateBlocks); a language without one can map them
 * along with the edit instead (mapBlocks), until the next run sends them.
 */
export const blockUpdate = Facet.define<BlockUpdate, BlockUpdate>({
  combine: (values) => values[0] ?? updateBlocks,
});

/**
 * Move blocks along with an edit, dropping blocks whose source was deleted,
 * as updateBlocks does when it cannot parse.
 */
export function mapBlocks(blocks: BlockMetadata[], tr: Transaction): BlockMetadata[] {
  if (!tr.docChanged) return blocks;
  return blocks.map((block) => block.map(tr)).filter((block) => block.source.from < block.source.to);
}

export const blockMetadataField = StateField.define<BlockMetadata[]>({
  create() {
    return [];
  },
  update(blocks, tr) {
    // Find if the block attributes effect is present.
    let blocksFromEffect: BlockMetadata[] | null = null;
    for (const effect of tr.effects) {
      if (effect.is(blockMetadataEffect)) {
        blocksFromEffect = effect.value;
        break;
      }
    }

    if (blocksFromEffect === null) {
      // If the block attributes effect is not present, then this transaction
      // is made by the user, we need to update the block attributes accroding
      // to the latest syntax tree.
      return tr.state.facet(blockUpdate)(blocks, tr);
    } else {
      // Otherwise, we need to update the block attributes according to the
      // metadata sent from the runtime. Most importantly, we need to translate
      // the position of each block after the changes has been made.
      return blocksFromEffect.map((block) => block.map(tr));
    }
  },
});

export const blockMetadataExtension = blockMetadataField.extension;
