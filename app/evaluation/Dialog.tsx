"use client";

import type {ReactNode} from "react";
import {cn} from "../cn.js";

interface DialogProps {
  open: boolean;
  children: ReactNode;
}

export function Dialog({open, children}: DialogProps) {
  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50")}>
      <div className={cn("bg-white rounded-lg shadow-xl p-6 min-w-[400px] max-w-[500px]")}>{children}</div>
    </div>
  );
}
