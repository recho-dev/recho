import {EditorView, ViewPlugin, type ViewUpdate} from "@codemirror/view";
import {Transaction} from "@codemirror/state";
import type {TransactionRecord, SelectionRange, ChangeRecord} from "./types.ts";

export function createInstrumentationExtension(
  onTransaction: (record: TransactionRecord) => void,
) {
  let nextIndex = 0;
  let startTime = 0;

  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        startTime = Date.now();

        // Capture initial document state
        const initRecord: TransactionRecord = {
          index: nextIndex++,
          timestamp: 0,
          docChanged: false,
          changes: [],
          annotations: {type: "init", doc: view.state.doc.toString()},
          selection: view.state.selection.ranges.map(
            (r): SelectionRange => ({
              from: r.from,
              to: r.to,
              anchor: r.anchor,
              head: r.head,
            }),
          ),
        };
        onTransaction(initRecord);
      }

      update(update: ViewUpdate) {
        for (const tr of update.transactions) {
          const userEvent = tr.annotation(Transaction.userEvent);
          const remote = tr.annotation(Transaction.remote);

          // Record both user-initiated and runtime-initiated transactions
          // Skip transactions that have no document changes and no user event
          if (!userEvent && !remote) continue;
          if (!tr.docChanged) continue;

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
            selection: tr.state.selection.ranges.map(
              (r): SelectionRange => ({
                from: r.from,
                to: r.to,
                anchor: r.anchor,
                head: r.head,
              }),
            ),
          };

          if (userEvent !== undefined) {
            record.annotations.userEvent = userEvent;
          }
          if (remote !== undefined) {
            record.annotations.remote = remote;
          }

          onTransaction(record);
        }
      }
    },
  );
}
