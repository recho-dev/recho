"use client";
import {useEffect, useRef, useSyncExternalStore} from "react";
import {Button} from "./Button.jsx";

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
 * Asks the user to confirm, instead of `confirm()`, and resolves to true or
 * false. `danger` styles the confirm button for actions that lose work.
 * Leaving the page (closing the tab, reloading) still uses the browser's own
 * prompt, since a page can't show its own UI then.
 */
export function confirmDialog({title, message, confirmLabel = "OK", cancelLabel = "Cancel", danger = false}) {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = {id: ++nextId, title, message, confirmLabel, cancelLabel, danger, resolve};
    emit();
  });
}

function settle(value) {
  if (!current) return;
  current.resolve(value);
  current = null;
  emit();
}

/** Where dialogs appear. Rendered once, in the root layout. */
export function Dialogs() {
  const shown = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const ref = useRef(null);
  // The last dialog stays rendered while it closes.
  const last = useRef(null);
  if (shown) last.current = shown;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (shown && !dialog.open) dialog.showModal();
    else if (!shown && dialog.open) dialog.close();
  }, [shown]);

  const item = last.current;
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      aria-describedby={item?.message ? "dialog-message" : undefined}
      // Escape cancels.
      onCancel={(e) => {
        e.preventDefault();
        settle(false);
      }}
      // A click on the backdrop (the dialog element itself, outside the panel) cancels.
      onClick={(e) => e.target === e.currentTarget && settle(false)}
    >
      {item && (
        <div className="dialog-panel" key={item.id}>
          <h2 id="dialog-title" className="dialog-title">
            {item.title}
          </h2>
          {item.message && (
            <p id="dialog-message" className="dialog-message">
              {item.message}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => settle(false)} autoFocus>
              {item.cancelLabel}
            </Button>
            <Button variant={item.danger ? "danger" : "primary"} onClick={() => settle(true)}>
              {item.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
