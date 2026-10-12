"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {cn} from "../../cn.js";

const BAR_HEIGHT = 40;
const BAR_TOP = 10;
const MARKER_BOTTOM_SPACE = 10;
const CANVAS_HEIGHT = BAR_TOP + BAR_HEIGHT + MARKER_BOTTOM_SPACE;
const CANVAS_TOP = 28;
const HANDLE_TRIANGLE_SIZE = 8;
const WRAPPER_HEIGHT = 96;
const PLAYBACK_FILL = [37, 99, 235];
const IDLE_COLOR = "#e5e7eb";
const RUNTIME_COLOR = "#7c3aed";
const INIT_COLOR = "#f59e0b";
const INTERACTION_COLOR = "#0f766e";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTimelineTime(ms) {
  const totalMs = Math.max(0, Math.round(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const tenths = Math.floor((totalMs % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function selectionsEqual(a = [], b = []) {
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

function hasExpandedSelection(selection = []) {
  return selection.some((range) => range.from !== range.to || range.anchor !== range.head);
}

function classifyTransactions(transactions = []) {
  let previousSelection = [];

  return transactions.map((transaction, index) => {
    const selection = Array.isArray(transaction.selection) ? transaction.selection : [];
    const selectionChanged = index === 0 ? false : !selectionsEqual(previousSelection, selection);
    const rangeCountChanged = index > 0 && previousSelection.length !== selection.length;
    const isInit = transaction.annotations?.type === "init";
    const isRuntime = transaction.annotations?.remote === true;
    const isTextEdit = transaction.docChanged === true && !isRuntime;
    const isSelectionOnly =
      !isInit &&
      !isRuntime &&
      transaction.docChanged !== true &&
      selectionChanged &&
      (rangeCountChanged || hasExpandedSelection(selection));
    const isCursorOnly =
      !isInit && !isRuntime && transaction.docChanged !== true && selectionChanged && !isSelectionOnly;

    previousSelection = selection;

    return {
      isInit,
      isRuntime,
      isTextEdit,
      isCursorOnly,
      isSelectionOnly,
    };
  });
}

function timeToBinIndex(timeMs, durationMs, binCount) {
  if (binCount <= 1 || durationMs <= 0) {
    return 0;
  }

  const ratio = clamp(timeMs / durationMs, 0, 1);
  return Math.min(binCount - 1, Math.floor(ratio * binCount));
}

function editFillColor(intensity) {
  return `rgba(${PLAYBACK_FILL[0]}, ${PLAYBACK_FILL[1]}, ${PLAYBACK_FILL[2]}, ${intensity})`;
}

export function ReplayTimeline({transactions, durationMs, playheadTimeMs, onSeekStart, onSeek, className}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const draggingRef = useRef(false);
  const [width, setWidth] = useState(0);
  const safeDurationMs = Math.max(0, durationMs ?? 0);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.max(1, Math.round(entries[0]?.contentRect.width ?? 0));
      setWidth(nextWidth);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const bins = useMemo(() => {
    if (width <= 0) {
      return [];
    }

    const transactionKinds = classifyTransactions(transactions);
    const aggregated = Array.from({length: width}, () => ({
      editCount: 0,
      hasRuntime: false,
      hasInit: false,
      hasCursorOnly: false,
      hasSelectionOnly: false,
    }));

    for (const [index, transaction] of transactions.entries()) {
      const binIndex = timeToBinIndex(transaction.timestamp ?? 0, safeDurationMs, width);
      const bin = aggregated[binIndex];
      const kind = transactionKinds[index];

      if (kind.isTextEdit) {
        bin.editCount += 1;
      }
      if (kind.isRuntime) {
        bin.hasRuntime = true;
      }
      if (kind.isInit) {
        bin.hasInit = true;
      }
      if (kind.isCursorOnly) {
        bin.hasCursorOnly = true;
      }
      if (kind.isSelectionOnly) {
        bin.hasSelectionOnly = true;
      }
    }

    const maxEditCount = aggregated.reduce((maxCount, bin) => Math.max(maxCount, bin.editCount), 0);
    return aggregated.map((bin) => ({
      ...bin,
      editIntensity: maxEditCount > 0 && bin.editCount > 0 ? 0.18 + 0.82 * Math.sqrt(bin.editCount / maxEditCount) : 0,
    }));
  }, [transactions, safeDurationMs, width]);

  const playheadLeft = useMemo(() => {
    if (width <= 0) {
      return 0;
    }

    if (safeDurationMs <= 0) {
      return 0;
    }

    const ratio = clamp(playheadTimeMs / safeDurationMs, 0, 1);
    return ratio * width;
  }, [playheadTimeMs, safeDurationMs, width]);

  const currentBin = useMemo(() => {
    if (bins.length === 0) {
      return null;
    }

    return bins[timeToBinIndex(playheadTimeMs, safeDurationMs, bins.length)];
  }, [bins, playheadTimeMs, safeDurationMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(CANVAS_HEIGHT * dpr));

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, CANVAS_HEIGHT);

    context.fillStyle = IDLE_COLOR;
    context.fillRect(0, BAR_TOP, width, BAR_HEIGHT);

    for (let x = 0; x < bins.length; x += 1) {
      const bin = bins[x];

      if (bin.editCount > 0) {
        context.fillStyle = editFillColor(bin.editIntensity);
        context.fillRect(x, BAR_TOP, 1, BAR_HEIGHT);
      }

      if (bin.hasRuntime) {
        context.fillStyle = RUNTIME_COLOR;
        context.fillRect(x, BAR_TOP - 2, 1, 6);
      }

      if (bin.hasInit) {
        context.fillStyle = INIT_COLOR;
        context.beginPath();
        context.moveTo(x + 0.5, BAR_TOP - 7);
        context.lineTo(x + 3.5, BAR_TOP - 4);
        context.lineTo(x + 0.5, BAR_TOP - 1);
        context.lineTo(x - 2.5, BAR_TOP - 4);
        context.closePath();
        context.fill();
      }

      if (bin.hasCursorOnly) {
        context.fillStyle = INTERACTION_COLOR;
        context.fillRect(x, BAR_TOP + BAR_HEIGHT + 2, 1, 5);
      }

      if (bin.hasSelectionOnly) {
        context.strokeStyle = INTERACTION_COLOR;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x - 2.5, BAR_TOP + BAR_HEIGHT + 7);
        context.lineTo(x - 2.5, BAR_TOP + BAR_HEIGHT + 3);
        context.lineTo(x + 2.5, BAR_TOP + BAR_HEIGHT + 3);
        context.lineTo(x + 2.5, BAR_TOP + BAR_HEIGHT + 7);
        context.stroke();
      }
    }

    context.strokeStyle = "#d1d5db";
    context.lineWidth = 1;
    context.strokeRect(0.5, BAR_TOP + 0.5, Math.max(0, width - 1), BAR_HEIGHT - 1);
  }, [bins, width]);

  const seekFromClientX = useCallback(
    (clientX) => {
      const element = wrapperRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const relativeX = clamp(clientX - rect.left, 0, rect.width);
      const nextTime = rect.width > 0 ? (relativeX / rect.width) * safeDurationMs : 0;
      onSeek(nextTime);
    },
    [onSeek, safeDurationMs],
  );

  const handlePointerDown = useCallback(
    (event) => {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      onSeekStart();
      seekFromClientX(event.clientX);
    },
    [onSeekStart, seekFromClientX],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!draggingRef.current) {
        return;
      }

      seekFromClientX(event.clientX);
    },
    [seekFromClientX],
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (!draggingRef.current) {
        return;
      }

      draggingRef.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      seekFromClientX(event.clientX);
    },
    [seekFromClientX],
  );

  const handlePointerCancel = useCallback((event) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const showIdle =
    !currentBin ||
    (currentBin.editCount === 0 &&
      !currentBin.hasRuntime &&
      !currentBin.hasInit &&
      !currentBin.hasCursorOnly &&
      !currentBin.hasSelectionOnly);

  return (
    <div
      ref={wrapperRef}
      className={cn("relative w-full cursor-col-resize select-none touch-none", className)}
      style={{height: `${WRAPPER_HEIGHT}px`}}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className={cn(
          "absolute z-20 max-w-[calc(100%-8px)] -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur-sm",
        )}
        style={{left: `${playheadLeft}px`, top: "0px"}}
      >
        <div className={cn("flex items-center gap-1.5 whitespace-nowrap")}>
          <span className={cn("font-mono text-gray-700")}>{formatTimelineTime(playheadTimeMs)}</span>
          {showIdle ? (
            <span className={cn("rounded bg-gray-100 px-1.5 py-0.5 text-gray-600")}>Idle</span>
          ) : (
            <>
              {currentBin.editCount > 0 && (
                <span className={cn("rounded bg-blue-100 px-1.5 py-0.5 text-blue-700")}>
                  Edits ×{currentBin.editCount}
                </span>
              )}
              {currentBin.hasRuntime && (
                <span className={cn("rounded bg-violet-100 px-1.5 py-0.5 text-violet-700")}>Runtime</span>
              )}
              {currentBin.hasCursorOnly && (
                <span className={cn("rounded bg-teal-100 px-1.5 py-0.5 text-teal-700")}>Cursor</span>
              )}
              {currentBin.hasSelectionOnly && (
                <span className={cn("rounded bg-teal-100 px-1.5 py-0.5 text-teal-700")}>Selection</span>
              )}
              {currentBin.hasInit && (
                <span className={cn("rounded bg-amber-100 px-1.5 py-0.5 text-amber-700")}>Init</span>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "absolute z-10 -translate-x-1/2 border-x-[8px] border-t-0 border-b-[8px] border-x-transparent border-b-gray-700",
        )}
        style={{left: `${playheadLeft}px`, top: `${CANVAS_TOP + BAR_TOP - HANDLE_TRIANGLE_SIZE}px`}}
      />
      <div
        className={cn(
          "absolute z-10 -translate-x-1/2 border-x-[8px] border-b-0 border-t-[8px] border-x-transparent border-t-gray-700",
        )}
        style={{left: `${playheadLeft}px`, top: `${CANVAS_TOP + BAR_TOP + BAR_HEIGHT}px`}}
      />
      <div className={cn("absolute z-10 h-full w-4 -translate-x-1/2")} style={{left: `${playheadLeft}px`}} />

      <canvas
        ref={canvasRef}
        width={Math.max(1, width)}
        height={CANVAS_HEIGHT}
        className={cn("absolute left-0 w-full")}
        style={{top: `${CANVAS_TOP}px`, height: `${CANVAS_HEIGHT}px`}}
      />
    </div>
  );
}
