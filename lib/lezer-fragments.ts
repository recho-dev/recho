import {NodeType, Tree, TreeFragment, type ChangedRange} from "@lezer/common";

/**
 * Work around a bug in `TreeFragment.applyChanges` from @lezer/common (seen
 * in 1.5.0 through 1.5.3).
 *
 * CodeMirror parses in time slices. When a slice runs out, it keeps the
 * partial tree as a fragment marked `openEnd`, so the next parse won't reuse
 * the last, possibly incomplete node. But when the document is edited,
 * `applyChanges` rebuilds the fragment after the last change with
 * `openEnd = false`, dropping that mark. The re-parse then reuses the
 * half-parsed node as if it were complete: if the slice stopped inside
 * `const v68 = 68;`, the statement comes back as two, `const v68 = ` and
 * `68;`.
 *
 * This is the upstream implementation (MIT, https://github.com/lezer-parser/common)
 * with one change: a rebuilt fragment keeps its own `openStart`/`openEnd`.
 * It is installed only when the installed version still has the bug, so it
 * switches itself off once a fixed version is released.
 */
function applyChanges(
  fragments: readonly TreeFragment[],
  changes: readonly ChangedRange[],
  minGap = 128,
): readonly TreeFragment[] {
  if (!changes.length) return fragments;
  const result: TreeFragment[] = [];
  let fI = 1,
    nextF: TreeFragment | null = fragments.length ? fragments[0]! : null;
  for (let cI = 0, pos = 0, off = 0; ; cI++) {
    const nextC = cI < changes.length ? changes[cI]! : null;
    const nextPos = nextC ? nextC.fromA : 1e9;
    if (nextPos - pos >= minGap)
      while (nextF && nextF.from < nextPos) {
        let cut: TreeFragment | null = nextF;
        if (pos >= cut.from || nextPos <= cut.to || off) {
          const fFrom = Math.max(cut.from, pos) - off,
            fTo = Math.min(cut.to, nextPos) - off;
          cut =
            fFrom >= fTo
              ? null
              : new TreeFragment(
                  fFrom,
                  fTo,
                  cut.tree,
                  cut.offset + off,
                  cI > 0 || cut.openStart,
                  !!nextC || cut.openEnd,
                );
        }
        if (cut) result.push(cut);
        if (nextF.to > nextPos) break;
        nextF = fI < fragments.length ? fragments[fI++]! : null;
      }
    if (!nextC) break;
    pos = nextC.toA;
    off = nextC.toA - nextC.toB;
  }
  return result;
}

/** Whether `applyChanges` drops `openEnd` from the fragment after an edit. */
function dropsOpenEnd(): boolean {
  const tree = new Tree(NodeType.none, [], [], 1000);
  const [partial] = TreeFragment.addTree(tree, [], true);
  const after = TreeFragment.applyChanges([partial!], [{fromA: 500, toA: 500, fromB: 500, toB: 501}]).at(-1);
  return after !== undefined && !after.openEnd;
}

if (dropsOpenEnd()) TreeFragment.applyChanges = applyChanges;
