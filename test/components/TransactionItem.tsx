import {useState, type ReactNode} from "react";
import type {TransactionData} from "./transaction-data.ts";
import {ObjectInspector} from "react-inspector";
import {cn} from "../../components/cn.js";
import {UserEvent} from "./UserEvent.tsx";
import {PencilLineIcon} from "lucide-react";
import {Remote} from "./Remote.tsx";

export function TransactionItem({transaction: tr}: {transaction: TransactionData}) {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (timestamp: number) => {
    const time = new Date(timestamp);
    return (
      time.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      "." +
      time.getMilliseconds().toString().padStart(3, "0")
    );
  };

  const summaryNodes: ReactNode[] = [
    <span key="index" className="font-mono font-medium">
      #{tr.index}
    </span>,
  ];

  if (typeof tr.annotations.userEvent === "string") {
    summaryNodes.push(<UserEvent key="userEvent" userEvent={tr.annotations.userEvent} />);
  } else if (tr.annotations.remote) {
    summaryNodes.push(<Remote key="remote" remoteValue={tr.annotations.remote} />);
  }
  if (tr.docChanged) {
    summaryNodes.push(<PencilLineIcon key="docChanged" className="w-4 h-4 text-blue-500" />);
  }

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={cn(
        "mb-2 border border-gray-200 rounded text-xs",
        tr.annotations.userEvent && "bg-blue-50",
        tr.docChanged && "border-l-4 border-l-blue-500",
      )}
    >
      <summary className="px-2 py-1.5 cursor-pointer hover:bg-gray-50 flex flex-wrap justify-between items-center gap-1">
        <span className="flex flex-row items-center gap-2">{summaryNodes}</span>
        <span className="text-gray-500">{formatTime(tr.timestamp)}</span>
      </summary>
      <div className="px-2 py-2 space-y-2 bg-white border-t border-gray-200">
        <div>
          <strong>Doc Changed:</strong> {tr.docChanged.toString()}
        </div>

        {tr.changes.length > 0 ? (
          <div>
            <strong>Changes:</strong>
            {tr.changes.map((change, idx) => {
              const deleted = change.to - change.from;
              const inserted = change.insert.length;
              const sameLine = change.fromLine === change.toLine;

              let posInfo = `pos ${change.from}-${change.to}`;
              if (sameLine) {
                posInfo += ` (L${change.fromLine}:${change.fromCol}-${change.toCol})`;
              } else {
                posInfo += ` (L${change.fromLine}:${change.fromCol} to L${change.toLine}:${change.toCol})`;
              }

              return (
                <div key={idx} className="ml-2 mt-1 p-1 bg-gray-50 rounded">
                  <div>
                    Change {idx + 1}: {posInfo}
                  </div>
                  {deleted > 0 && <div className="text-red-600">Deleted {deleted} chars</div>}
                  {inserted > 0 && (
                    <div className="text-green-600">
                      Inserted: <code className="bg-gray-200 px-1 rounded">{change.insert}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <strong>Changes:</strong> none
          </div>
        )}

        {Object.keys(tr.annotations).length > 0 ? (
          <div>
            <strong>Annotations:</strong>
            {Object.entries(tr.annotations).map(([key, value]) => (
              <div key={key} className="ml-2">
                {key}: {JSON.stringify(value)}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <strong>Annotations:</strong> none
          </div>
        )}

        {tr.effects.length > 0 ? (
          <div>
            <strong>Effects:</strong> {tr.effects.length}
            {tr.blockMetadata ? (
              <div className="p-1 bg-purple-50 rounded">
                <div className="font-medium">blockMetadataEffect ({tr.blockMetadata.length} blocks)</div>
                {tr.blockMetadata.map((block, blockIdx) => (
                  <div key={blockIdx} className="ml-2 mt-1 text-xs">
                    <div className="font-medium">Block {blockIdx + 1}:</div>
                    <div>
                      {block.output !== null ? `Output: ${block.output.from}-${block.output.to}` : "Output: null"}
                    </div>
                    <div>
                      Source: {block.source.from}-{block.source.to}
                    </div>
                    {Object.keys(block.attributes).length > 0 && (
                      <div>Attributes: {JSON.stringify(block.attributes)}</div>
                    )}
                    {block.error && <div className="text-red-600">Error: true</div>}
                  </div>
                ))}
              </div>
            ) : null}
            {tr.effects.map((effect, idx) => (
              <div key={idx} className="ml-2 mt-1">
                <div>
                  <span>
                    Effect {idx + 1} ({effect.type}):{" "}
                  </span>
                  <ObjectInspector data={effect.value} expandLevel={1} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <strong>Effects:</strong> none
          </div>
        )}

        <div>
          <strong>Selection:</strong>
          {tr.selection.map((range, idx) => {
            const isCursor = range.from === range.to;
            return (
              <div key={idx} className="ml-2">
                Range {idx + 1}: {isCursor ? `cursor at ${range.from}` : `${range.from}-${range.to}`}
                {!isCursor && ` (anchor: ${range.anchor}, head: ${range.head})`}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
