"use client";

import {useState, useEffect, useRef, useMemo} from "react";
import Link from "next/link";
import {notFound, useParams} from "next/navigation";
import {cn} from "../../../../cn.js";
import {ReplayEditor} from "../../ReplayEditor.jsx";
import {ReplayTimeline} from "../../ReplayTimeline.jsx";
import {buildReplayStateData} from "../../replay-state.js";

const PREVIEW_PLAYBACK_DURATION_MS = 20_000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function upperBoundTimestamp(transactions, playheadTimeMs) {
  let low = 0;
  let high = transactions.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((transactions[mid]?.timestamp ?? 0) <= playheadTimeMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function formatPlaybackTime(ms) {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export default function EvaluationDetailPage() {
  const params = useParams();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [playheadTimeMs, setPlayheadTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);
  const playheadRef = useRef(0);

  useEffect(() => {
    playheadRef.current = playheadTimeMs;
  }, [playheadTimeMs]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluation() {
      try {
        const res = await fetch(`/api/evaluations/${params.id}`);

        if (res.status === 404) {
          if (!cancelled) {
            setMissing(true);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load evaluation (${res.status})`);
        }

        const data = await res.json();
        if (cancelled) return;

        setEvaluation(data);
        setLoading(false);
        if (data.tasks?.length > 0) setSelectedTask(0);
        document.title = `P#${data.participantId} - ${data.participantName} | Evaluation`;
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load evaluation:", e);
        setLoading(false);
      }
    }

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Precompute all document states and cumulative change positions for the selected task.
  const {
    docStates,
    scrollPositions,
    highlights,
    totalTransactions,
    taskDurationMs,
    repairedRuntimeTransactions,
    skippedRuntimeTransactions,
  } = useMemo(() => {
    if (!evaluation || selectedTask === null || !evaluation.tasks[selectedTask]) {
      return {
        docStates: [""],
        scrollPositions: [null],
        highlights: [[]],
        totalTransactions: 0,
        taskDurationMs: 0,
        repairedRuntimeTransactions: 0,
        skippedRuntimeTransactions: 0,
      };
    }

    return buildReplayStateData(evaluation.tasks[selectedTask]);
  }, [evaluation, selectedTask]);

  const task = selectedTask !== null && evaluation ? evaluation.tasks[selectedTask] : null;
  const replayIndex = useMemo(
    () => (task ? upperBoundTimestamp(task.transactions, playheadTimeMs) : 0),
    [task, playheadTimeMs],
  );

  // Reset replay position when task changes — show final code.
  useEffect(() => {
    stopReplay();
    setPlayheadTimeMs(taskDurationMs);
    playheadRef.current = taskDurationMs;
  }, [selectedTask, taskDurationMs]);

  // Time-compressed playback loop.
  useEffect(() => {
    if (!playing || taskDurationMs <= 0) {
      return;
    }

    const playbackStartTime = performance.now();
    const startPlayhead = playheadRef.current;
    const playbackRate = taskDurationMs / PREVIEW_PLAYBACK_DURATION_MS;

    const tick = (now) => {
      const elapsed = now - playbackStartTime;
      const nextPlayhead = Math.min(taskDurationMs, startPlayhead + elapsed * playbackRate);
      setPlayheadTimeMs(nextPlayhead);

      if (nextPlayhead >= taskDurationMs) {
        rafRef.current = null;
        setPlaying(false);
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, taskDurationMs]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  function startReplay() {
    if (taskDurationMs <= 0) {
      return;
    }

    const shouldRestart = playheadTimeMs >= taskDurationMs;
    const nextPlayhead = shouldRestart ? 0 : playheadTimeMs;
    if (shouldRestart) {
      setPlayheadTimeMs(0);
    }
    playheadRef.current = nextPlayhead;
    setPlaying(true);
  }

  function stopReplay() {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlaying(false);
  }

  function handleSeek(nextPlayheadTimeMs) {
    const clampedPlayhead = clamp(nextPlayheadTimeMs, 0, taskDurationMs);
    playheadRef.current = clampedPlayhead;
    setPlayheadTimeMs(clampedPlayhead);
  }

  if (loading) {
    return (
      <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
        <p className={cn("text-gray-500")}>Loading evaluation...</p>
      </div>
    );
  }

  if (missing) {
    notFound();
  }

  if (!evaluation) {
    return (
      <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
        <p className={cn("text-red-500")}>Evaluation not found.</p>
      </div>
    );
  }

  function formatDuration(start, end) {
    if (end == null) {
      return "In progress";
    }
    const ms = end - start;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  const currentDoc = docStates[replayIndex] ?? "";
  const scrollToPos = scrollPositions[replayIndex];
  const currentHighlights = highlights[replayIndex] ?? [];

  return (
    <div className={cn("max-w-[1600px] mx-auto px-4 py-8")}>
      {/* Header */}
      <div className={cn("mb-8 flex items-start justify-between gap-4")}>
        <div>
          <h1 className={cn("text-2xl font-bold mb-1")}>
            {evaluation.participantName || "(unnamed)"} (P#{evaluation.participantId})
          </h1>
          <p className={cn("text-sm text-gray-500")}>
            Session: {new Date(evaluation.sessionStartTime).toLocaleString()}
            {evaluation.sessionEndTime && <> &mdash; {new Date(evaluation.sessionEndTime).toLocaleString()}</>}
          </p>
          <p className={cn("text-sm text-gray-500")}>
            {evaluation.tasks?.length || 0} tasks completed
            {evaluation.questionnaire && " \u00b7 Questionnaire submitted"}
          </p>
          <p className={cn("text-xs text-gray-400 mt-1 font-mono")}>{evaluation.id}</p>
        </div>
        <div className={cn("flex items-center gap-2")}>
          <Link
            href="/evaluation/manage/sessions"
            className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
          >
            All Sessions
          </Link>
          <Link
            href={`/evaluation/manage/sessions/${evaluation.id}/questionnaire`}
            className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
          >
            Questionnaire
          </Link>
        </div>
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
                <span>Duration: {formatDuration(task.startTime, task.endTime ?? task.lastCheckpointTime ?? null)}</span>
                <span>{task.transactions.length} transactions</span>
                {task.pauseEvents?.length > 0 && <span>{task.pauseEvents.length} pauses</span>}
                {task.status === "in_progress" && (
                  <span className={cn("bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs")}>
                    In progress
                  </span>
                )}
              </div>
              {(repairedRuntimeTransactions > 0 || skippedRuntimeTransactions > 0) && (
                <div className={cn("mb-3 flex flex-wrap gap-3 text-xs text-amber-700")}>
                  {repairedRuntimeTransactions > 0 && (
                    <span>{repairedRuntimeTransactions} runtime updates repaired from missing local edits</span>
                  )}
                  {skippedRuntimeTransactions > 0 && (
                    <span>
                      {skippedRuntimeTransactions} runtime updates skipped because their base state was inconsistent
                    </span>
                  )}
                </div>
              )}

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
                    disabled={totalTransactions === 0 || taskDurationMs <= 0}
                    className={cn(
                      "px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
                    )}
                  >
                    Replay
                  </button>
                )}
                <span className={cn("text-xs text-gray-400 tabular-nums min-w-[120px]")}>
                  {formatPlaybackTime(playheadTimeMs)} / {formatPlaybackTime(taskDurationMs)}
                  {!playing && playheadTimeMs >= taskDurationMs && " (final)"}
                </span>
              </div>

              <ReplayTimeline
                transactions={task.transactions}
                durationMs={taskDurationMs}
                playheadTimeMs={playheadTimeMs}
                onSeekStart={stopReplay}
                onSeek={handleSeek}
                className={cn("mb-3")}
              />

              {/* Code display — real CodeMirror editor (readonly) */}
              <ReplayEditor
                doc={currentDoc}
                scrollToPos={scrollToPos}
                highlights={currentHighlights}
                className={cn("border border-gray-200 rounded-lg overflow-hidden h-[calc(100vh-18rem)] min-h-[36rem]")}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
