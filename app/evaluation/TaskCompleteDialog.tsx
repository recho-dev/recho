"use client";

import {cn} from "../cn.js";
import {Dialog} from "./Dialog.tsx";

interface TaskCompleteDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TaskCompleteDialog({open, onConfirm, onCancel}: TaskCompleteDialogProps) {
  return (
    <Dialog open={open}>
      <h2 className={cn("text-lg font-semibold mb-4")}>Task Complete</h2>
      <p className={cn("text-sm text-gray-600 mb-6")}>Okay, now we are going to the next task.</p>
      <div className={cn("flex justify-end gap-2")}>
        <button
          type="button"
          onClick={onCancel}
          className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn("px-4 py-2 text-sm rounded-md bg-green-700 text-white hover:bg-green-800")}
        >
          Confirm
        </button>
      </div>
    </Dialog>
  );
}
