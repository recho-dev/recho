"use client";
import {useEffect, useState} from "react";
import {cn} from "./cn.js";

/**
 * A thin progress bar with a label, while `loading`. Starting a compiler
 * blocks the page and module downloads report no progress, so the bar is
 * indeterminate: a segment slides along it, animated off the main thread.
 * When loading ends, the bar fills up and fades out over the top of whatever
 * replaced the label.
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
    <div className={cn("relative")}>
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-gray-100 transition-opacity duration-300",
          // Fade out once the full bar has been seen.
          !loading && "opacity-0 delay-200",
        )}
        role="progressbar"
        aria-label={label}
        aria-busy={loading}
      >
        <div
          className={cn("h-full bg-gray-800", loading ? "w-2/5 animate-loading-slide" : "w-full")}
          style={{willChange: "transform"}}
        />
      </div>
      {loading && label && <p className={cn("px-4 pt-3 pb-4 text-sm text-gray-500")}>{label}</p>}
    </div>
  );
}
