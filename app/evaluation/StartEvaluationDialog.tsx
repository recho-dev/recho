"use client";

import {useState} from "react";
import {cn} from "../cn.js";
import {Dialog} from "./Dialog.tsx";
import {evaluationStore} from "./store.ts";

interface StartEvaluationDialogProps {
  open: boolean;
}

export function StartEvaluationDialog({open}: StartEvaluationDialogProps) {
  const [name, setName] = useState("");
  const [participantId, setParticipantId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(participantId, 10);
    if (!name.trim() || isNaN(id)) return;
    evaluationStore.startEvaluation(name.trim(), id);
    setName("");
    setParticipantId("");
  }

  function handleCancel() {
    evaluationStore.closeStartDialog();
    setName("");
    setParticipantId("");
  }

  return (
    <Dialog open={open}>
      <h2 className={cn("text-lg font-semibold mb-4")}>Start Evaluation</h2>
      <form onSubmit={handleSubmit}>
        <div className={cn("mb-4")}>
          <label className={cn("block text-sm font-medium mb-1")}>Participant Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={cn("w-full border border-gray-300 rounded-md px-3 py-2 text-sm")}
            placeholder="Enter participant name"
            autoFocus
          />
        </div>
        <div className={cn("mb-6")}>
          <label className={cn("block text-sm font-medium mb-1")}>Participant ID</label>
          <div className={cn("flex items-center")}>
            <span
              className={cn(
                "border border-r-0 border-gray-300 rounded-l-md px-3 py-2 text-sm bg-gray-50 text-gray-500 select-none",
              )}
            >
              P-
            </span>
            <input
              type="number"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              required
              min="1"
              className={cn("flex-1 border border-gray-300 rounded-r-md px-3 py-2 text-sm")}
              placeholder="Enter participant ID"
            />
          </div>
        </div>
        <div className={cn("flex justify-end gap-2")}>
          <button
            type="button"
            onClick={handleCancel}
            className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={cn("px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700")}
          >
            Start
          </button>
        </div>
      </form>
    </Dialog>
  );
}
