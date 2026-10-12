import {EditorView, ViewPlugin, type ViewUpdate} from "@codemirror/view";
import {Transaction} from "@codemirror/state";
import type {TransactionRecord, SelectionRange, ChangeRecord} from "./types.ts";

function selectionsEqual(a: SelectionRange[], b: SelectionRange[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((range, index) => {
    const other = b[index];
    return (
      range.from === other.from && range.to === other.to && range.anchor === other.anchor && range.head === other.head
    );
  });
}

export function shouldRecordEvaluationTransaction({
  docChanged,
  selectionChanged,
  remote,
}: {
  docChanged: boolean;
  selectionChanged: boolean;
  remote: unknown;
}) {
  if (remote !== undefined) {
    return docChanged;
  }

  return docChanged || selectionChanged;
}

export function createInstrumentationExtension(
  onTransaction: (record: TransactionRecord) => void,
  options?: {
    captureInitialState?: boolean;
    startIndex?: number;
    startTimeMs?: number;
  },
) {
  const captureInitialState = options?.captureInitialState ?? true;
  let nextIndex = options?.startIndex ?? 0;
  let startTime = 0;
  let lastSelection: SelectionRange[] = [];

  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        startTime = options?.startTimeMs ?? Date.now();
        lastSelection = view.state.selection.ranges.map(
          (r): SelectionRange => ({
            from: r.from,
            to: r.to,
            anchor: r.anchor,
            head: r.head,
          }),
        );

        if (!captureInitialState) {
          return;
        }

        // Capture initial document state
        const initRecord: TransactionRecord = {
          index: nextIndex++,
          timestamp: 0,
          docChanged: false,
          changes: [],
          annotations: {type: "init", doc: view.state.doc.toString()},
          selection: lastSelection,
        };
        onTransaction(initRecord);
      }

      update(update: ViewUpdate) {
        for (const tr of update.transactions) {
          const userEvent = tr.annotation(Transaction.userEvent);
          const remote = tr.annotation(Transaction.remote);
          const selection = tr.state.selection.ranges.map(
            (r): SelectionRange => ({
              from: r.from,
              to: r.to,
              anchor: r.anchor,
              head: r.head,
            }),
          );
          const selectionChanged = !selectionsEqual(lastSelection, selection);

          // Record any local doc/selection change, even if CodeMirror does not
          // attach a userEvent annotation. Runtime transactions are only useful
          // for replay if they actually mutate the document.
          if (
            !shouldRecordEvaluationTransaction({
              docChanged: tr.docChanged,
              selectionChanged,
              remote,
            })
          ) {
            lastSelection = selection;
            continue;
          }

          const changes: ChangeRecord[] = [];
          tr.changes.iterChanges(
            (fromA: number, toA: number, _fromB: number, _toB: number, inserted: {toString(): string}) => {
              changes.push({
                from: fromA,
                to: toA,
                insert: inserted.toString(),
              });
            },
          );

          const record: TransactionRecord = {
            index: nextIndex++,
            timestamp: Date.now() - startTime,
            docChanged: tr.docChanged,
            changes,
            annotations: {},
            selection,
          };

          if (userEvent !== undefined) {
            record.annotations.userEvent = userEvent;
          }
          if (remote !== undefined) {
            record.annotations.remote = remote;
          }

          onTransaction(record);
          lastSelection = selection;
        }
      }
    },
  );
}
