"use client";

import {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {useParams} from "next/navigation";
import {cn} from "../../../cn.js";
import {susItems, susScaleLabels, nasaTlxDimensions} from "../../questionnaire-data.ts";

export default function EvaluationDetailPage() {
  const params = useParams();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);
  const codeRef = useRef(null);

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
    const sorted = [...changes].sort((a, b) => b.from - a.from);
    let result = doc;
    for (const change of sorted) {
      result = result.slice(0, change.from) + change.insert + result.slice(change.to);
    }
    return result;
  }, []);

  // Precompute all document states and change positions for the selected task
  const {docStates, changePositions, totalTransactions} = useMemo(() => {
    if (!evaluation || selectedTask === null || !evaluation.tasks[selectedTask]) {
      return {docStates: [""], changePositions: [null], totalTransactions: 0};
    }
    const task = evaluation.tasks[selectedTask];
    const states = [];
    const positions = [];
    let doc = task.initialCode || "";
    states.push(doc);
    positions.push(null);
    for (const tx of task.transactions) {
      if (tx.docChanged && tx.changes.length > 0) {
        doc = applyChanges(doc, tx.changes);
        positions.push(tx.changes[0].from);
      } else {
        positions.push(null);
      }
      states.push(doc);
    }
    return {docStates: states, changePositions: positions, totalTransactions: task.transactions.length};
  }, [evaluation, selectedTask, applyChanges]);

  const task = selectedTask !== null && evaluation ? evaluation.tasks[selectedTask] : null;

  // Reset replay index when task changes — show final code
  useEffect(() => {
    stopReplay();
    setReplayIndex(totalTransactions);
  }, [selectedTask, totalTransactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to editing position during replay
  useEffect(() => {
    if (!codeRef.current || replayIndex <= 0) return;
    const charPos = changePositions[replayIndex];
    if (charPos == null) return;
    const doc = docStates[replayIndex] || "";
    const lineNum = doc.substring(0, Math.min(charPos, doc.length)).split("\n").length - 1;
    const lineHeight = 20;
    codeRef.current.scrollTop = Math.max(0, lineNum * lineHeight - codeRef.current.clientHeight / 2);
  }, [replayIndex, docStates, changePositions]);

  // Playback timer
  useEffect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= totalTransactions) {
          clearInterval(timer);
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 50);

    timerRef.current = timer;

    return () => {
      clearInterval(timer);
      timerRef.current = null;
    };
  }, [playing, totalTransactions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startReplay() {
    if (totalTransactions === 0) return;
    setReplayIndex(0);
    setPlaying(true);
  }

  function stopReplay() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }

  function handleSeek(e) {
    const newIndex = parseInt(e.target.value, 10);
    stopReplay();
    setReplayIndex(newIndex);
  }

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

  const questionnaire = evaluation.questionnaire;

  function formatDuration(start, end) {
    const ms = end - start;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  const currentDoc = docStates[replayIndex] ?? "";

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
              <div className={cn("flex items-center gap-2 mb-2")}>
                {playing ? (
                  <button
                    onClick={stopReplay}
                    className={cn("px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700")}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={startReplay}
                    disabled={totalTransactions === 0}
                    className={cn(
                      "px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
                    )}
                  >
                    Replay
                  </button>
                )}
                <span className={cn("text-xs text-gray-400 tabular-nums min-w-[100px]")}>
                  {replayIndex} / {totalTransactions}
                  {!playing && replayIndex === totalTransactions && " (final)"}
                </span>
              </div>

              {/* Progress bar */}
              {totalTransactions > 0 && (
                <div className={cn("mb-3")}>
                  <input
                    type="range"
                    min={0}
                    max={totalTransactions}
                    value={replayIndex}
                    onChange={handleSeek}
                    className={cn("w-full accent-blue-600 h-2 cursor-pointer")}
                  />
                </div>
              )}

              {/* Code display */}
              <pre
                ref={codeRef}
                className={cn(
                  "bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap",
                )}
              >
                {currentDoc}
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
