"use client";
import {useEffect, useRef, useState} from "react";

/**
 * Open state for a menu or listbox under a trigger: it closes on a click
 * outside `ref` and on Escape, which gives the focus back to the trigger.
 */
export function usePopover({onClose} = {}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  // The latest onClose, so the listeners subscribe once per opening.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      onCloseRef.current?.();
    };
    const onPointerDown = (e) => ref.current && !ref.current.contains(e.target) && close();
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return {open, setOpen, ref, triggerRef};
}

/** Moves the focus among the items of a menu or listbox with the arrow keys. */
export function onArrowKeys(e, selector) {
  const items = [...e.currentTarget.querySelectorAll(selector)].filter((item) => !item.disabled);
  if (!items.length) return;
  const index = items.indexOf(document.activeElement);
  let next = null;
  if (e.key === "ArrowDown") next = items[(index + 1) % items.length];
  else if (e.key === "ArrowUp") next = items[(index - 1 + items.length) % items.length];
  else if (e.key === "Home") next = items[0];
  else if (e.key === "End") next = items[items.length - 1];
  if (!next) return;
  e.preventDefault();
  next.focus();
}
