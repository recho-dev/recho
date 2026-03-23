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

export function TaskInputDialog({open, onExit}: TaskInputDialogProps) {
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");
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
    setTaskId("");
    evaluationStore.setCurrentTask(trimmed);
  }

  function handleExit() {
    setTaskId("");
    setError("");
    evaluationStore.closeTaskInputDialog();
    if (onExit) onExit();
  }

  return (
    <Dialog open={open}>
      <h2 className={cn("text-lg font-semibold mb-2")}>Enter Task ID</h2>
      <p className={cn("text-sm text-gray-500 mb-4")}>
        Task {evalState.currentTaskIndex + 1} of 4
        {evalState.currentTaskIndex > 0 && ` (${evalState.currentTaskIndex} completed)`}
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
            onClick={handleExit}
            className={cn("px-4 py-2 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50")}
          >
            Exit Evaluation
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
