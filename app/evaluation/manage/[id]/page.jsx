"use client";

import {useState, useEffect, useRef, useCallback} from "react";
import {useParams} from "next/navigation";
import {cn} from "../../../cn.js";
import {susItems, susScaleLabels, nasaTlxDimensions} from "../../questionnaire-data.ts";

export default function EvaluationDetailPage() {
  const params = useParams();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [replayState, setReplayState] = useState({playing: false, index: 0, doc: ""});
  const timerRef = useRef(null);

  useEffect(() => {
    fetch(`/api/evaluations/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setEvaluation(data);
        setLoading(false);
        if (data.tasks?.length > 0) setSelectedTask(0);
        document.title = `P#${data.participantId} - ${data.participantName} | Evaluation`;
      })
      .catch((e) => {
        console.error("Failed to load evaluation:", e);
        setLoading(false);
      });
  }, [params.id]);

  // Apply a single transaction's changes to a document string
  const applyChanges = useCallback((doc, changes) => {
    // Process changes in reverse order to keep indices valid
    const sorted = [...changes].sort((a, b) => b.from - a.from);
    let result = doc;
    for (const change of sorted) {
      result = result.slice(0, change.from) + change.insert + result.slice(change.to);
    }
    return result;
  }, []);

  // Start replay for selected task
  function startReplay() {
    const task = evaluation.tasks[selectedTask];
    if (!task || task.transactions.length === 0) return;

    // Find the initial doc state from the first transaction that has an initialDoc annotation
    const initialDoc = task.initialCode || "";
    setReplayState({playing: true, index: 0, doc: initialDoc});

    let idx = 0;
    let currentDoc = initialDoc;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (idx >= task.transactions.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setReplayState((s) => ({...s, playing: false}));
        return;
      }

      const tx = task.transactions[idx];
      if (tx.docChanged && tx.changes.length > 0) {
        currentDoc = applyChanges(currentDoc, tx.changes);
      }
      idx++;
      setReplayState({playing: true, index: idx, doc: currentDoc});
    }, 50);
  }

  function stopReplay() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setReplayState((s) => ({...s, playing: false}));
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // When selected task changes, reset replay and show final code
  useEffect(() => {
    stopReplay();
    if (evaluation && selectedTask !== null && evaluation.tasks[selectedTask]) {
      setReplayState({playing: false, index: 0, doc: evaluation.tasks[selectedTask].finalCode || ""});
    }
  }, [selectedTask, evaluation]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
        <p className={cn("text-gray-500")}>Loading evaluation...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
        <p className={cn("text-red-500")}>Evaluation not found.</p>
      </div>
    );
  }

  const task = selectedTask !== null ? evaluation.tasks[selectedTask] : null;
  const questionnaire = evaluation.questionnaire;

  function formatDuration(start, end) {
    const ms = end - start;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  return (
    <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
      {/* Header */}
      <div className={cn("mb-8")}>
        <h1 className={cn("text-2xl font-bold mb-1")}>
          {evaluation.participantName || "(unnamed)"} (P#{evaluation.participantId})
        </h1>
        <p className={cn("text-sm text-gray-500")}>
          Session: {new Date(evaluation.sessionStartTime).toLocaleString()}
          {evaluation.sessionEndTime && (
            <> &mdash; {new Date(evaluation.sessionEndTime).toLocaleString()}</>
          )}
        </p>
        <p className={cn("text-sm text-gray-500")}>
          {evaluation.tasks?.length || 0} tasks completed
          {questionnaire && " \u00b7 Questionnaire submitted"}
        </p>
        <p className={cn("text-xs text-gray-400 mt-1 font-mono")}>{evaluation.id}</p>
      </div>

      {/* Task Tabs + Replay */}
      {evaluation.tasks?.length > 0 && (
        <section className={cn("mb-10")}>
          <h2 className={cn("text-lg font-semibold mb-3")}>Tasks</h2>

          {/* Tab bar */}
          <div className={cn("flex gap-1 mb-4 border-b border-gray-200")}>
            {evaluation.tasks.map((t, i) => (
              <button
                key={i}
                onClick={() => setSelectedTask(i)}
                className={cn(
                  "px-3 py-2 text-sm rounded-t-md transition-colors",
                  selectedTask === i
                    ? "bg-white border border-gray-200 border-b-white -mb-px font-medium"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                Task {t.taskId}
                <span className={cn("ml-1 text-xs text-gray-400")}>({t.difficulty})</span>
              </button>
            ))}
          </div>

          {/* Task detail */}
          {task && (
            <div>
              <div className={cn("flex items-center gap-4 mb-3 text-sm text-gray-500")}>
                <span>Duration: {formatDuration(task.startTime, task.endTime)}</span>
                <span>{task.transactions.length} transactions</span>
                {task.pauseEvents?.length > 0 && <span>{task.pauseEvents.length} pauses</span>}
              </div>

              {/* Replay controls */}
              <div className={cn("flex items-center gap-2 mb-3")}>
                {replayState.playing ? (
                  <button
                    onClick={stopReplay}
                    className={cn("px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700")}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={startReplay}
                    disabled={task.transactions.length === 0}
                    className={cn(
                      "px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
                    )}
                  >
                    Replay
                  </button>
                )}
                <span className={cn("text-xs text-gray-400")}>
                  {replayState.playing
                    ? `${replayState.index} / ${task.transactions.length}`
                    : "Showing final code"}
                </span>
              </div>

              {/* Code display */}
              <pre
                className={cn(
                  "bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap",
                )}
              >
                {replayState.doc}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* Questionnaire Results */}
      {questionnaire && (
        <section className={cn("mb-10")}>
          <h2 className={cn("text-lg font-semibold mb-4")}>Questionnaire Results</h2>

          {/* SUS */}
          <div className={cn("mb-6")}>
            <h3 className={cn("font-medium mb-1")}>
              System Usability Scale (SUS)
              <span className={cn("ml-2 text-blue-600 font-bold")}>Score: {questionnaire.sus.score}</span>
            </h3>

            <div className={cn("border border-gray-200 rounded-lg overflow-hidden text-sm")}>
              <div
                className={cn("grid items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium")}
                style={{gridTemplateColumns: "1fr repeat(5, 48px)"}}
              >
                <div />
                {susScaleLabels.map((label, i) => (
                  <div key={label} className={cn("text-center")}>{i + 1}</div>
                ))}
              </div>
              {susItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "grid items-center gap-2 px-4 py-2 border-b border-gray-100 last:border-b-0",
                    index % 2 === 1 && "bg-gray-50/50",
                  )}
                  style={{gridTemplateColumns: "1fr repeat(5, 48px)"}}
                >
                  <div className={cn("text-sm")}>
                    <span className={cn("text-gray-400 mr-2")}>{item.id}.</span>
                    {item.text}
                  </div>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <div key={value} className={cn("flex justify-center")}>
                      {questionnaire.sus.items[index] === value ? (
                        <span className={cn("w-4 h-4 rounded-full bg-blue-600 block")} />
                      ) : (
                        <span className={cn("w-4 h-4 rounded-full border border-gray-300 block")} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* NASA-TLX */}
          <div>
            <h3 className={cn("font-medium mb-3")}>NASA Task Load Index</h3>
            <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4")}>
              {nasaTlxDimensions.map((dim) => {
                const value = questionnaire.nasaTlx[dim.id];
                return (
                  <div key={dim.id} className={cn("border border-gray-200 rounded-lg p-3")}>
                    <div className={cn("flex items-baseline justify-between mb-1")}>
                      <span className={cn("text-sm font-medium")}>{dim.label}</span>
                      <span className={cn("text-sm font-mono text-blue-600")}>{value}</span>
                    </div>
                    <div className={cn("w-full bg-gray-200 rounded-full h-2")}>
                      <div
                        className={cn("bg-blue-600 h-2 rounded-full")}
                        style={{width: `${value}%`}}
                      />
                    </div>
                    <div className={cn("flex justify-between text-xs text-gray-400 mt-1")}>
                      <span>{dim.lowAnchor}</span>
                      <span>{dim.highAnchor}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
