"use client";
import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {cn} from "./cn.js";

let current = null;
let nextId = 0;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

const store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => current,
  getServerSnapshot: () => null,
};

/**
 * Shows a short message at the bottom of the page, instead of `alert()`.
 * `error` styles it as an error; it stays up longer then.
 */
export function toast(message, {error = false, duration = error ? 6000 : 3000} = {}) {
  current = {id: ++nextId, message, error, duration};
  emit();
}

/** Where toasts appear. Rendered once, in the root layout. */
export function Toaster() {
  const shown = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [open, setOpen] = useState(false);
  // The last toast stays rendered while it leaves, then hides.
  const last = useRef(null);
  if (shown) last.current = shown;

  useEffect(() => {
    if (!shown) return;
    setOpen(true);
    const timeout = setTimeout(() => setOpen(false), shown.duration);
    return () => clearTimeout(timeout);
  }, [shown]);

  const item = last.current;
  return (
    <div className="toaster" role="status" aria-live="polite">
      {item && (
        <div key={item.id} className={cn("toast", item.error && "err")} hidden={!open}>
          {item.message}
        </div>
      )}
    </div>
  );
}
