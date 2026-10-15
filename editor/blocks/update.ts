import {Transaction} from "@codemirror/state";
import {blockRangeLength, findAffectedBlockRange} from "../../lib/blocks.ts";
import {blocksMatchTree, detectBlocksWithinRange, isMarkLineText, topLevelCoverage} from "../../lib/blocks/detect.ts";
import {ensureSyntaxTree, syntaxTree, syntaxTreeAvailable} from "@codemirror/language";
import {BlockMetadata} from "./BlockMetadata.ts";
// Keeps incremental re-parses from splitting a half-parsed statement.
import "../../lib/lezer-fragments.ts";

/**
 * Verbose per-transaction logging is only enabled in the test environment
 * (the playground defines `process.env.NODE_ENV` as "test", see
 * `vite.config.js` and `editor/blocks/index.ts`). Invariant violations are
 * reported with `console.error` unconditionally.
 */
const DEBUG = process.env.NODE_ENV === "test";

/**
 * How long `updateBlocks` may spend finishing the syntax tree of the new
 * document. CodeMirror gives the parser only 20ms per transaction, and the
 * tree a state holds is a snapshot taken when that budget ran out — so under
 * load, or for a document longer than the initial 3000-character parse
 * viewport, `syntaxTree(tr.state)` can end far before the document does.
 * Block detection walks the whole tree, so it must never run on a stump.
 */
const PARSE_BUDGET_MS = 50;

/**
 * Give each detected block the identity (id and attributes) of the old block
 * whose mapped source range it overlaps the most — so identity survives
 * ordinary typing as well as splits, merges, and swallows. A donor donates at
 * most once. Every old-block index that overlaps some detected block is added
 * to `superseded`.
 */
function reconcileDetectedBlocks(
  detectedBlocks: BlockMetadata[],
  oldBlocks: BlockMetadata[],
  mappedOldBlocks: BlockMetadata[],
  tr: Transaction,
  superseded: Set<number>,
): BlockMetadata[] {
  /** Indices of old blocks that have already donated their identity. */
  const donated = new Set<number>();
  const reconciledBlocks: BlockMetadata[] = [];

  let searchFrom = 0;
  for (const block of detectedBlocks) {
    // Skip old blocks that end before this detected block starts. Both arrays
    // are sorted, so `searchFrom` only ever moves forward.
    while (searchFrom < mappedOldBlocks.length && mappedOldBlocks[searchFrom]!.source.to <= block.source.from) {
      searchFrom++;
    }

    // Find the overlapping old block with the largest source overlap.
    let bestIndex = -1;
    let bestOverlap = 0;
    for (let k = searchFrom; k < mappedOldBlocks.length; k++) {
      const mapped = mappedOldBlocks[k]!;
      if (mapped.source.from >= block.source.to) break;
      superseded.add(k);
      const overlap = Math.min(mapped.source.to, block.source.to) - Math.max(mapped.source.from, block.source.from);
      if (!donated.has(k) && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = k;
      }
    }

    if (bestIndex === -1) {
      // No old block overlaps this detected block; it is genuinely new.
      if (DEBUG) console.log("Keeping detected block as-is:", block);
      reconciledBlocks.push(block);
    } else {
      donated.add(bestIndex);
      const donor = mappedOldBlocks[bestIndex]!;
      // The error flag describes the last run's outcome for this exact
      // statement, so it only survives when the source range is unchanged
      // and the change did not touch the statement's text.
      const donorOld = oldBlocks[bestIndex]!;
      const untouched =
        donor.source.from === block.source.from &&
        donor.source.to === block.source.to &&
        !tr.changes.touchesRange(donorOld.source.from, donorOld.source.to);
      const reconciled = new BlockMetadata(
        donor.id,
        block.name,
        block.output,
        block.source,
        donor.attributes,
        untouched ? donor.error : false,
      );
      if (DEBUG) console.log("Detected block inherits identity:", reconciled, "from old block:", donor);
      reconciledBlocks.push(reconciled);
    }
  }

  return reconciledBlocks;
}

/**
 * Handle a transaction without document changes. Most such transactions are
 * irrelevant here, but when the syntax tree differs from the start state's,
 * the background parser has finished a parse that an earlier transaction had
 * to cut short. If the tree now spans the whole document and the blocks
 * disagree with it, re-detect everything and reconcile against the current
 * blocks so identity and attributes survive.
 */
function recoverFromCompletedParse(oldBlocks: BlockMetadata[], tr: Transaction): BlockMetadata[] {
  const tree = syntaxTree(tr.state);
  if (tree === syntaxTree(tr.startState)) return oldBlocks;
  if (!syntaxTreeAvailable(tr.state)) return oldBlocks;
  if (blocksMatchTree(tree, oldBlocks)) return oldBlocks;

  if (DEBUG) console.log("Parse completed with a different tree; re-detecting all blocks");
  const detected = detectBlocksWithinRange(tree, tr.state.doc, 0, tr.state.doc.length);
  const mappedOldBlocks = oldBlocks.map((block) => block.map(tr));
  return reconcileDetectedBlocks(detected, oldBlocks, mappedOldBlocks, tr, new Set());
}

/**
 * Update block metadata according to the given transaction.
 *
 * The guiding principle: the freshly re-parsed blocks are the ground truth
 * for block *structure*, while the old blocks are the ground truth for block
 * *identity* (ids and user-customized attributes). An edit inside one block
 * can move statement boundaries far beyond the re-parsed span — for example,
 * an unterminated template literal swallows the rest of the document — so
 * whenever a re-parsed block overlaps old blocks, the re-parsed block
 * supersedes them and inherits the identity of the one it overlaps the most.
 *
 * @param oldBlocks the current blocks
 * @param tr the editor transaction
 */
export function updateBlocks(oldBlocks: BlockMetadata[], tr: Transaction): BlockMetadata[] {
  // A transaction that leaves the document alone can still carry a new syntax
  // tree: the background parser dispatches one when it finishes a parse that
  // did not fit into an earlier transaction's budget. That is the moment to
  // repair blocks computed from (or kept stale by) an incomplete tree.
  if (!tr.docChanged) return recoverFromCompletedParse(oldBlocks, tr);

  const userEvent = tr.annotation(Transaction.userEvent);
  if (DEBUG) {
    if (userEvent) {
      console.group(`updateBlocks (${userEvent})`);
    } else {
      console.groupCollapsed(`updateBlocks`);
    }
  }

  if (tr.changes.empty) {
    if (DEBUG) {
      console.log("No changes detected");
      console.groupEnd();
    }
    return oldBlocks;
  }

  // Finish parsing the new document before reading its tree. When even the
  // extra budget is not enough, keep the old blocks — mapped into the new
  // coordinates so their positions stay right — and let the parser-completion
  // transaction (see above) redo the structure once the tree is whole.
  const tree = ensureSyntaxTree(tr.state, tr.state.doc.length, PARSE_BUDGET_MS);
  if (tree === null) {
    if (DEBUG) {
      console.log("Syntax tree is incomplete; keeping mapped old blocks until the parser catches up");
      console.groupEnd();
    }
    // A block whose statement was deleted maps to an empty range; drop it
    // rather than hand decorations a zero-length block.
    return oldBlocks.map((block) => block.map(tr)).filter((block) => block.source.from < block.source.to);
  }

  /**
   * Keep track of all blocks that are affected by the change. They will not
   * survive into the array of new blocks, but they may donate their identity
   * to a re-parsed block.
   */
  const affectedBlocks = new Set<BlockMetadata>();

  /**
   * The old blocks mapped into the new document's coordinate space. Used to
   * expand re-parse spans, to donate identity to detected blocks, and as the
   * surviving blocks outside the damaged regions.
   */
  const mappedOldBlocks = oldBlocks.map((block) => block.map(tr));

  /**
   * The final re-parse spans, in new-document coordinates. Every old block
   * overlapping a damage range is stale: it is either re-detected within the
   * span or gone for good (e.g. swallowed by an unterminated block comment,
   * which produces no block of its own).
   */
  const damageRanges: {from: number; to: number}[] = [];

  /**
   * Blocks detected in the re-parsed spans. Each re-parse produces blocks in
   * document order; only a transaction with several changed ranges can make
   * the collected runs interleave, so a single sort afterwards suffices.
   */
  const newlyCreatedBlocks: BlockMetadata[] = [];

  // Process changed ranges one by one, because ranges are disjoint.
  tr.changes.iterChanges((oldFrom, oldTo, newFrom, newTo) => {
    if (DEBUG) {
      if (oldFrom === oldTo) {
        if (newFrom === oldFrom) {
          console.groupCollapsed(`Insert ${newTo - newFrom} characters at ${oldFrom}`);
        } else {
          console.groupCollapsed(`Insert ${newTo - newFrom} characters: ${oldFrom} -> ${newFrom}-${newTo}`);
        }
      } else {
        console.groupCollapsed(`Update: ${oldFrom}-${oldTo} -> ${newFrom}-${newTo}`);
      }
    }

    // Step 1: Find the blocks that are affected by the change.

    const affectedBlockRange = findAffectedBlockRange(oldBlocks, oldFrom, oldTo);

    if (DEBUG) console.log(`Affected block range: ${affectedBlockRange[0]} to ${affectedBlockRange[1] ?? "the end"}`);

    // Add the affected blocks to the set.
    for (let i = affectedBlockRange[0] ?? 0, n = affectedBlockRange[1] ?? oldBlocks.length; i < n; i++) {
      affectedBlocks.add(oldBlocks[i]!);
    }

    // Check a corner case where the affected block range is empty but there are blocks.
    if (blockRangeLength(oldBlocks.length, affectedBlockRange) === 0 && oldBlocks.length > 0) {
      console.error("This should never happen");
    }

    // Now, we are going to compute the range which should be re-parsed. The
    // affected blocks' positions are in the old document's coordinate space,
    // so they must be mapped through the changes before being used against
    // the new document and its syntax tree.
    let reparseFrom =
      affectedBlockRange[0] === null ? 0 : tr.changes.mapPos(oldBlocks[affectedBlockRange[0]]!.from, -1);
    let reparseTo =
      affectedBlockRange[1] === null
        ? tr.state.doc.length
        : tr.changes.mapPos(oldBlocks[affectedBlockRange[1] - 1]!.to, 1);

    // The affected block range is only a prediction: the edit may move node
    // boundaries far beyond it. A statement can swallow its neighbors (an
    // unterminated template literal), a non-statement node can swallow
    // statements (an unterminated block comment), and a partially swallowed
    // block leaves a tail of live statements behind. Expand the span to a
    // fixed point: every top-level node it touches and every old block it
    // partially overlaps must lie fully inside it.
    for (;;) {
      let extendedFrom = reparseFrom;
      let extendedTo = reparseTo;

      const coverage = topLevelCoverage(tree, reparseFrom, reparseTo);
      if (coverage !== null) {
        extendedFrom = Math.min(extendedFrom, coverage.from);
        extendedTo = Math.max(extendedTo, coverage.to);
      }

      // Mapped blocks are sorted and disjoint, so blocks that end before the
      // span cannot overlap it, and neither can any block after the first one
      // that starts at or past the span's (growing) end. Absorbing a block
      // can only pull `extendedFrom` down to that block's `from`, which all
      // skipped blocks end at or before, so they never overlap retroactively.
      for (let i = 0, n = mappedOldBlocks.length; i < n; i++) {
        const mapped = mappedOldBlocks[i]!;
        if (mapped.to <= extendedFrom) continue;
        if (extendedTo <= mapped.from) break;
        extendedFrom = Math.min(extendedFrom, mapped.from);
        extendedTo = Math.max(extendedTo, mapped.to);
      }

      // A mark-comment line at the end of the span may serve as the output of
      // the first statement below the span, and its attachment changes with
      // the span's content — pull following lines in until the span no longer
      // ends amid mark-comment lines. (The check is textual, so this can
      // over-extend into look-alike lines; a wider span is merely re-parsed.)
      let endLine = tr.state.doc.lineAt(extendedTo);
      while (isMarkLineText(endLine.text) && endLine.to < tr.state.doc.length) {
        endLine = tr.state.doc.lineAt(endLine.to + 1);
        extendedTo = Math.max(extendedTo, endLine.to);
      }

      if (extendedFrom === reparseFrom && extendedTo === reparseTo) break;
      if (DEBUG) console.log(`Expanding re-parse span: ${reparseFrom}-${reparseTo} -> ${extendedFrom}-${extendedTo}`);
      reparseFrom = extendedFrom;
      reparseTo = extendedTo;
    }

    damageRanges.push({from: reparseFrom, to: reparseTo});

    const newBlocks = detectBlocksWithinRange(tree, tr.state.doc, reparseFrom, reparseTo);

    if (DEBUG) console.log("New blocks from reparsed range:", newBlocks);

    newlyCreatedBlocks.push(...newBlocks);

    if (DEBUG) console.groupEnd();
  });

  // Step 2: Sort the detected blocks by position. The same statement can be
  // detected twice when the re-parse spans of two changed ranges overlap, so
  // drop blocks that repeat the previous source range. Of two detections of
  // the same statement, the one carrying an output range has the smaller
  // `from` and thus comes first — it is the one we keep.

  newlyCreatedBlocks.sort((a, b) => a.from - b.from);

  const detectedBlocks: BlockMetadata[] = [];

  for (const block of newlyCreatedBlocks) {
    const last = detectedBlocks[detectedBlocks.length - 1];
    if (last !== undefined && last.source.from === block.source.from && last.source.to === block.source.to) {
      continue;
    }
    detectedBlocks.push(block);
  }

  // Step 3: Reconcile detected blocks with old blocks. Any old block whose
  // mapped source range overlaps a detected block is superseded by it — this
  // is exactly the situation that used to surface as a "weird overlap": the
  // re-parse found a statement extending past the predicted span, and the
  // stale old blocks inside it must yield. Each detected block inherits the
  // id and attributes of the old block it overlaps the most (whether that old
  // block was affected or merely superseded), so identity survives ordinary
  // typing as well as splits and merges.

  if (DEBUG) console.group("Reconciling detected blocks with old blocks");

  /** Indices of old blocks that overlap some detected block. */
  const superseded = new Set<number>();
  const reconciledBlocks = reconcileDetectedBlocks(detectedBlocks, oldBlocks, mappedOldBlocks, tr, superseded);

  // Every old block overlapping a re-parsed span is stale: if it still exists
  // it was re-detected (and donated its identity above); otherwise it is gone
  // for good — swallowed by a node that produces no block, such as an
  // unterminated block comment.
  for (const damage of damageRanges) {
    for (let k = 0, n = mappedOldBlocks.length; k < n; k++) {
      const mapped = mappedOldBlocks[k]!;
      if (mapped.to <= damage.from) continue;
      if (mapped.from >= damage.to) break;
      superseded.add(k);
    }
  }

  if (DEBUG) console.groupEnd();

  // Step 4: Combine the surviving old blocks and the reconciled blocks. Both
  // arrays are sorted, so this is a plain merge. Old blocks survive only if
  // they were neither affected by a change nor superseded by a detected block.

  const newBlocks: BlockMetadata[] = [];
  let reconciledIndex = 0;

  for (let i = 0, n = oldBlocks.length; i < n; i++) {
    if (affectedBlocks.has(oldBlocks[i]!) || superseded.has(i)) continue;
    const survivor = mappedOldBlocks[i]!;
    while (reconciledIndex < reconciledBlocks.length && reconciledBlocks[reconciledIndex]!.from < survivor.from) {
      newBlocks.push(reconciledBlocks[reconciledIndex]!);
      reconciledIndex++;
    }
    newBlocks.push(survivor);
  }

  while (reconciledIndex < reconciledBlocks.length) {
    newBlocks.push(reconciledBlocks[reconciledIndex]!);
    reconciledIndex++;
  }

  // Step 5: Validate the result against the actual syntax tree. In a document
  // with syntax errors, an edit can re-segment statements arbitrarily far
  // away — a quote or backtick re-pairs every token after it — with no chain
  // of overlapping nodes connecting the change to the divergence, so no local
  // span expansion can ever be complete. When the incremental result does not
  // match the tree, fall back to a full re-detect, reconciled against the old
  // blocks so identity and attributes still survive.
  let finalBlocks = newBlocks;
  if (!blocksMatchTree(tree, newBlocks)) {
    if (DEBUG) console.log("Merged blocks do not match the tree; falling back to a full re-detect");
    const fullDetected = detectBlocksWithinRange(tree, tr.state.doc, 0, tr.state.doc.length);
    finalBlocks = reconcileDetectedBlocks(fullDetected, oldBlocks, mappedOldBlocks, tr, new Set());
  }

  // Invariant check: blocks must be sorted and disjoint.
  for (let i = 1, n = finalBlocks.length; i < n; i++) {
    if (finalBlocks[i]!.from < finalBlocks[i - 1]!.to) {
      console.error("Blocks overlap after update", {previous: finalBlocks[i - 1], current: finalBlocks[i]});
    }
  }

  if (DEBUG) {
    console.log("New blocks:", finalBlocks);
    console.groupEnd();
  }
  return finalBlocks;
}
