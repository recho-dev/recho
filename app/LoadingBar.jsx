"use client";
import {useEffect, useState} from "react";
import {cn} from "./cn.js";

/**
 * A label and a progress bar centred over the area of the editor, while
 * `loading`. Starting a compiler blocks the page and module downloads report
 * no progress, so the bar is indeterminate: a segment slides along it,
 * animated off the main thread. When loading ends, the bar fills up and the
 * whole overlay fades out, revealing the editor beneath.
 */
export function LoadingBar({loading, label}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (loading) return setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(timeout);
  }, [loading]);

  if (!visible) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-1 flex flex-col items-center justify-center gap-3 bg-white transition-opacity duration-300",
        // Fade out once the full bar has been seen.
        !loading && "pointer-events-none opacity-0 delay-200",
      )}
    >
      {label && <p className={cn("text-sm text-gray-500")}>{label}</p>}
      <div
        className={cn("h-1 w-56 overflow-hidden rounded-full bg-gray-100")}
        role="progressbar"
        aria-label={label}
        aria-busy={loading}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gray-800",
            loading ? "w-2/5 animate-loading-slide" : "w-full transition-[width] duration-200",
          )}
          style={{willChange: "transform"}}
        />
      </div>
    </div>
  );
}
