"use client";
import {useId, useState} from "react";
import {Check, ChevronDown} from "lucide-react";
import {cn} from "./cn.js";
import {usePopover, onArrowKeys} from "./usePopover.js";

/**
 * A select: a button showing the chosen option, over a listbox of options
 * with a tick on the chosen one. Use it instead of a native <select>.
 *
 * @param {object} props
 * @param {string} props.label - The accessible name.
 * @param {{value: string, label: string, hint?: string}[]} props.options - `hint` is a short note at the right of an option.
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {boolean} [props.ghost] - No border, for toolbars.
 * @param {"left" | "right"} [props.align] - Which edge the list lines up with.
 * @param {boolean} [props.disabled]
 */
export function Listbox({label, options, value, onChange, ghost = false, align = "left", disabled = false}) {
  const {open, setOpen, ref, triggerRef} = usePopover();
  const id = useId();
  const current = options.find((option) => option.value === value) ?? options[0];
  // Opens toward the other edge when the list would leave the window there.
  const [flip, setFlip] = useState(false);

  function show() {
    setFlip(false);
    setOpen(true);
    requestAnimationFrame(() => {
      const wrap = ref.current;
      const menu = wrap?.querySelector(".menu");
      if (!menu) return;
      // offsetWidth, as the opening scale would shrink the measured box.
      const {left, right} = wrap.getBoundingClientRect();
      const margin = 8;
      setFlip(align === "left" ? left + menu.offsetWidth > innerWidth - margin : right - menu.offsetWidth < margin);
      menu.querySelector('[aria-selected="true"]')?.focus();
    });
  }

  function choose(option) {
    setOpen(false);
    triggerRef.current?.focus();
    if (option.value !== value) onChange(option.value);
  }

  function onTriggerKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className={cn("btn picker", ghost && "ghost")}
        aria-label={`${label}: ${current?.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{current?.label}</span>
        <ChevronDown className="ic" size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div
        id={id}
        className={cn("menu", (align === "left") !== flip && "left")}
        role="listbox"
        aria-label={label}
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === "Tab") setOpen(false);
          onArrowKeys(e, ".menu-item");
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            className="menu-item"
            aria-selected={option.value === current?.value}
            onClick={() => choose(option)}
          >
            <Check className="ic tick" size={14} strokeWidth={1.75} aria-hidden="true" />
            {option.label}
            {option.hint && <span className="hint">{option.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
