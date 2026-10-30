import {type Text} from "@codemirror/state";
import {OUTPUT_MARK, ERROR_MARK} from "../../runtime/constant.js";
import {syntaxTree} from "@codemirror/language";
import {BlockMetadata, type Range} from "../../editor/blocks/BlockMetadata.ts";
import {nanoid} from "nanoid";

const OUTPUT_MARK_CODE_POINT = OUTPUT_MARK.codePointAt(0);
const ERROR_MARK_CODE_POINT = ERROR_MARK.codePointAt(0);

// Since CodeMirror does not export `SyntaxNode`, we have to get it in this way.
type Tree = ReturnType<typeof syntaxTree>;
type SyntaxNode = Tree["topNode"];

/** The marks that end an output line's prefix, e.g. `//➜` or wenyan's `批曰。「「➜`. */
export const PREFIX_END = /^.{0,8}?[➜✗]/u;

/**
 * Classify the given line text as a `//➜` output line, a `//✗` error line, or
 * neither. This is a purely textual check: every real mark line is classified
 * correctly, but a line matching here is not necessarily a top-level comment
 * (it could sit inside a template literal, for example).
 */
export function markLineType(text: string): "output" | "error" | null {
  if (!text.startsWith("//")) return null;
  const codePoint = text.codePointAt(2);
  if (codePoint === OUTPUT_MARK_CODE_POINT) return "output";
  if (codePoint === ERROR_MARK_CODE_POINT) return "error";
  return null;
}

/**
 * Check whether the given line text looks like a `//➜` output or `//✗` error
 * comment produced by the runtime.
 */
export function isMarkLineText(text: string): boolean {
  return markLineType(text) !== null;
}

/**
 * Check whether the given line is entirely a `//➜` output or `//✗` error
 * comment produced by the runtime.
 */
function isMarkLine(line: {from: number; to: number; text: string}, node: {from: number; to: number}): boolean {
  // The comment must cover the entire line.
  if (line.from !== node.from || line.to !== node.to) return false;
  return isMarkLineText(line.text);
}

/** Check whether a top-level syntax node with this name constitutes a block. */
export function isBlockNode(name: string): boolean {
  return name.includes("Statement") || name.includes("Declaration") || name === "Block";
}

/**
 * Collect the run of output/error comment lines directly above the given
 * statement. The run must be contiguous: a non-mark comment or a blank line
 * ends it, because the runtime always writes output immediately above the
 * statement that produced it.
 */
function extendOutputForward(doc: Text, node: SyntaxNode): Range | null {
  let outputRange: Range | null = null;
  let expectedLine = doc.lineAt(node.from).number - 1;
  let currentNode = node.prevSibling;

  while (currentNode?.name === "LineComment" && expectedLine >= 1) {
    const line = doc.lineAt(currentNode.from);
    if (line.number !== expectedLine || !isMarkLine(line, currentNode)) break;
    outputRange = outputRange === null ? {from: line.from, to: line.to} : {from: line.from, to: outputRange.to};
    expectedLine = line.number - 1;
    currentNode = currentNode.prevSibling;
  }

  return outputRange;
}

/**
 * Check whether the given blocks' source ranges exactly match the top-level
 * statements of the syntax tree. In a document with syntax errors, an edit
 * can re-segment statements arbitrarily far away from the edited position
 * (for example, a quote re-pairs every string after it), so an incrementally
 * updated block array must be validated against the tree it claims to
 * describe. This walk is cheap: it visits only the direct children of
 * `Script` and allocates nothing.
 */
export function blocksMatchTree(tree: Tree, blocks: {source: Range}[]): boolean {
  let index = 0;
  const cursor = tree.cursor();

  if (cursor.firstChild()) {
    do {
      if (!isBlockNode(cursor.name)) continue;
      const block = blocks[index++];
      if (block === undefined || block.source.from !== cursor.from || block.source.to !== cursor.to) {
        return false;
      }
    } while (cursor.nextSibling());
  }

  return index === blocks.length;
}

/**
 * Compute the extent actually covered by the top-level nodes overlapping the
 * given range — including nodes that are not statements, such as comments.
 * An edit can make a non-statement node swallow content far beyond the edited
 * range (typically an unterminated block comment), and unlike a growing
 * statement, such a node produces no detected block. The caller uses this
 * coverage to invalidate stale blocks inside it.
 */
export function topLevelCoverage(tree: Tree, from: number, to: number): Range | null {
  let coverage: Range | null = null;

  tree.iterate({
    from,
    to,
    enter: (node) => {
      // Descend only from the root node into its direct children.
      if (node.name === "Script") return true;
      coverage =
        coverage === null
          ? {from: node.from, to: node.to}
          : {from: Math.min(coverage.from, node.from), to: Math.max(coverage.to, node.to)};
      return false;
    },
  });

  return coverage;
}

/**
 * Detect blocks in a given range by traversing the syntax tree.
 * Similar to how runtime/index.js uses acorn to parse blocks, but adapted for CodeMirror.
 *
 * Only the direct children of `Script` are visited — blocks are top-level
 * statements by definition, so there is no reason to descend into statement
 * bodies. This keeps the traversal proportional to the number of top-level
 * nodes in the range instead of the total number of syntax nodes.
 */
export function detectBlocksWithinRange(tree: Tree, doc: Text, from: number, to: number): BlockMetadata[] {
  const blocks: BlockMetadata[] = [];

  tree.iterate({
    from,
    to,
    enter: (node) => {
      // Descend only from the root node into its direct children.
      if (node.name === "Script") return true;

      // Check if this is a statement (not a comment)
      if (isBlockNode(node.name)) {
        const statement = node.node;
        const outputRange = extendOutputForward(doc, statement);
        blocks.push(new BlockMetadata(nanoid(), node.name, outputRange, {from: node.from, to: node.to}));
      }

      // Never descend below the top level.
      return false;
    },
  });

  return blocks;
}
