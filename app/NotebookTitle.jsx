"use client";
import {useEffect, useRef} from "react";
import {cn} from "./cn.js";

/**
 * A notebook's title, edited in place like a heading in a document. Enter or
 * leaving it commits the title, Escape undoes the edit, and an empty title is
 * put back. When `focusKey` changes, the title is focused and selected.
 */
export function NotebookTitle({value, onChange, focusKey = null}) {
  const ref = useRef(null);

  // The text is written here rather than rendered, so that React doesn't move
  // the caret while typing.
  useEffect(() => {
    if (document.activeElement !== ref.current) ref.current.textContent = value;
  }, [value]);

  useEffect(() => {
    if (focusKey === null) return;
    const element = ref.current;
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, [focusKey]);

  function onBlur() {
    const title = ref.current.textContent.replace(/\s+/g, " ").trim();
    ref.current.textContent = title || value;
    if (title && title !== value) onChange(title);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      ref.current.blur();
    } else if (e.key === "Escape") {
      ref.current.textContent = value;
      ref.current.blur();
    }
  }

  return (
    <h1
      ref={ref}
      className={cn("page-title title-edit")}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label="Notebook title"
      spellCheck={false}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
