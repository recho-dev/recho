"use client";
import {useEffect, useState} from "react";

/** A key or shortcut, e.g. <Kbd>⌘S</Kbd>. */
export function Kbd({children}) {
  return <kbd className="kbd">{children}</kbd>;
}

/** Whether the page runs on a Mac, where shortcuts use ⌘ rather than Ctrl. */
export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * The label of a shortcut with the platform's modifier: "⌘S" on a Mac,
 * "Ctrl+S" elsewhere. It reads the platform after mounting, so the server
 * render and the first client render agree.
 */
export function useShortcut(key) {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(isMac()), []);
  return mac ? `⌘${key}` : `Ctrl+${key}`;
}
