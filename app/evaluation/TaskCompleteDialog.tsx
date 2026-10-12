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
      <p className={cn("text-sm text-gray-600 mb-2")}>
        By clicking the Next button, this task will be ended and you will not be able to go back.
      </p>
      <p className={cn("text-sm text-gray-500 mb-6 italic")}>
        Please let the participant click the button below when ready.
      </p>
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
          Next
        </button>
      </div>
    </Dialog>
  );
}
