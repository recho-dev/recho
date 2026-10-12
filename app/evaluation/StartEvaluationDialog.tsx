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
  const [errors, setErrors] = useState<{name?: string; id?: string}>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: {name?: string; id?: string} = {};
    if (!name.trim()) {
      newErrors.name = "Please enter the participant's name.";
    }
    const id = parseInt(participantId, 10);
    if (!participantId.trim() || isNaN(id) || id < 1) {
      newErrors.id = "Please enter a valid participant ID (positive number).";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    const started = await evaluationStore.startEvaluation(name.trim(), id);
    if (started) {
      setName("");
      setParticipantId("");
    }
  }

  function handleCancel() {
    evaluationStore.closeStartDialog();
    setName("");
    setParticipantId("");
  }

  return (
    <Dialog open={open}>
      <h2 className={cn("text-lg font-semibold mb-4")}>Start or Resume Evaluation</h2>
      <form onSubmit={handleSubmit}>
        <div className={cn("mb-4")}>
          <label className={cn("block text-sm font-medium mb-1")}>Participant Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({...prev, name: undefined}));
            }}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm",
              errors.name ? "border-red-400" : "border-gray-300",
            )}
            placeholder="Enter participant name"
            autoFocus
          />
          {errors.name && <p className={cn("text-red-500 text-xs mt-1")}>{errors.name}</p>}
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
              onChange={(e) => {
                setParticipantId(e.target.value);
                if (errors.id) setErrors((prev) => ({...prev, id: undefined}));
              }}
              min="1"
              className={cn(
                "flex-1 border rounded-r-md px-3 py-2 text-sm",
                errors.id ? "border-red-400" : "border-gray-300",
              )}
              placeholder="Enter participant ID"
            />
          </div>
          {errors.id && <p className={cn("text-red-500 text-xs mt-1")}>{errors.id}</p>}
        </div>
        <div className={cn("flex justify-end gap-2")}>
          <button
            type="button"
            onClick={handleCancel}
            className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
          >
            Cancel
          </button>
          <button type="submit" className={cn("px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700")}>
            Start / Resume
          </button>
        </div>
      </form>
    </Dialog>
  );
}
