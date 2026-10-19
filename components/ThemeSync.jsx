"use client";
import {useEffect} from "react";

/**
 * The app follows the system theme through tokens.css. When the theme
 * changes, transitions pause for one frame, so nothing lags behind the swap.
 */
export function ThemeSync() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const onChange = () => {
      root.classList.add("no-motion");
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-motion")));
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return null;
}
