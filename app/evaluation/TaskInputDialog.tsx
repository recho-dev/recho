"use client";

import {useState, useSyncExternalStore} from "react";
import {cn} from "../cn.js";
import {Dialog} from "./Dialog.tsx";
import {evaluationStore} from "./store.ts";
import {getTaskById} from "./tasks.ts";

interface TaskInputDialogProps {
  open: boolean;
  onExit?: () => void;
}

type ConfirmAction = null | "start" | "exit";

export function TaskInputDialog({open, onExit}: TaskInputDialogProps) {
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<ConfirmAction>(null);
  const [pendingTaskId, setPendingTaskId] = useState("");
  const evalState = useSyncExternalStore(
    evaluationStore.subscribe,
    evaluationStore.getSnapshot,
    evaluationStore.getServerSnapshot,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = taskId.trim();
    const task = getTaskById(trimmed);
    if (!task) {
      setError(`Task "${trimmed}" not found. Valid IDs: 1-12.`);
      return;
    }
    setError("");
    setPendingTaskId(trimmed);
    setConfirming("start");
  }

  function handleExitClick() {
    setConfirming("exit");
  }

  function handleConfirm() {
    if (confirming === "start") {
      setTaskId("");
      setConfirming(null);
      evaluationStore.setCurrentTask(pendingTaskId);
      setPendingTaskId("");
    } else if (confirming === "exit") {
      setTaskId("");
      setError("");
      setConfirming(null);
      evaluationStore.closeTaskInputDialog();
      if (onExit) onExit();
    }
  }

  function handleCancelConfirm() {
    setConfirming(null);
    setPendingTaskId("");
  }

  // Confirmation view
  if (confirming) {
    return (
      <Dialog open={open}>
        <h2 className={cn("text-lg font-semibold mb-2")}>
          {confirming === "start" ? "Confirm Start Task" : "End Tasks"}
        </h2>
        <p className={cn("text-sm text-gray-600 mb-6")}>
          {confirming === "start"
            ? `By clicking start, you will see the problem statement and be able to work on it. A timer will start, but you can pause to read Docs or leave for JavaScript tutorials.`
            : "You are about to finish the tasks section. After this, you will be asked to fill out a short questionnaire about your experience. Ready to continue?"}
        </p>
        <div className={cn("flex justify-end gap-2")}>
          <button
            onClick={handleCancelConfirm}
            className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              "px-4 py-2 text-sm rounded-md text-white",
              confirming === "exit" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {confirming === "start" ? "Start Task" : "Continue to Questionnaire"}
          </button>
        </div>
      </Dialog>
    );
  }

  // Normal task input view
  return (
    <Dialog open={open}>
      <h2 className={cn("text-lg font-semibold mb-2")}>Enter Task ID</h2>
      <p className={cn("text-sm text-gray-500 mb-2")}>
        Task {evalState.currentTaskIndex + 1} of 4
        {evalState.currentTaskIndex > 0 && ` (${evalState.currentTaskIndex} completed)`}
      </p>
      <p className={cn("text-sm text-gray-500 mb-4")}>
        The researcher will tell you the task ID to enter below.
      </p>
      <form onSubmit={handleSubmit}>
        <div className={cn("mb-4")}>
          <input
            type="text"
            value={taskId}
            onChange={(e) => {
              setTaskId(e.target.value);
              setError("");
            }}
            required
            className={cn("w-full border border-gray-300 rounded-md px-3 py-2 text-sm")}
            placeholder="Enter Task ID (1-12)"
            autoFocus
          />
          {error && <p className={cn("text-red-500 text-xs mt-1")}>{error}</p>}
        </div>
        <div className={cn("flex justify-between")}>
          <button
            type="button"
            onClick={handleExitClick}
            className={cn("px-4 py-2 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50")}
          >
            End Tasks
          </button>
          <button
            type="submit"
            className={cn("px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700")}
          >
            Start Task
          </button>
        </div>
      </form>
    </Dialog>
  );
}
