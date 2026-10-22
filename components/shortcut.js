"use client";
import {useEffect, useState} from "react";

/** Whether the page runs on a Mac, where shortcuts use ⌘ rather than Ctrl. */
export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * The label of a shortcut with the platform's modifier: "⌘S" on a Mac,
 * "Ctrl+S" elsewhere. It is null until the page mounts, as the server can't
 * tell the platform, so no wrong hint shows first.
 */
export function useShortcut(key) {
  const [mac, setMac] = useState(null);
  useEffect(() => setMac(isMac()), []);
  if (mac === null) return null;
  return mac ? `⌘${key}` : `Ctrl+${key}`;
}
