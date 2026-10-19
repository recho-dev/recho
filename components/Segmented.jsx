"use client";
import {useEffect, useLayoutEffect, useRef} from "react";

/**
 * A segmented control: a row of options, one of them chosen. A single pill
 * slides to the chosen option; it snaps into place on first paint and when
 * the control resizes, and with reduced motion.
 *
 * @param {object} props
 * @param {string} props.label - The accessible name of the group.
 * @param {{value: string, label: string}[]} props.options
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 */
export function Segmented({label, options, value, onChange}) {
  const ref = useRef(null);
  const pillRef = useRef(null);
  const placed = useRef(false);
  const optionsKey = options.map((option) => option.value).join("\n");

  // Puts the pill under the chosen option, sliding there only if `animate`.
  function place(animate) {
    const seg = ref.current;
    const pill = pillRef.current;
    if (!seg || !pill) return;
    const on = seg.querySelector('button[aria-pressed="true"]');
    if (!on) {
      pill.hidden = true;
      seg.classList.remove("has-pill");
      return;
    }
    const wasHidden = pill.hidden;
    pill.hidden = false;
    seg.classList.add("has-pill");
    const snap = !animate || wasHidden;
    if (snap) pill.style.transition = "none";
    pill.style.translate = `${on.offsetLeft}px ${on.offsetTop}px`;
    pill.style.width = `${on.offsetWidth}px`;
    if (snap) {
      void pill.offsetWidth;
      pill.style.transition = "";
    }
  }

  // Slide to a new choice; snap on first paint.
  useLayoutEffect(() => {
    place(placed.current);
    placed.current = true;
  }, [value, optionsKey]);

  // Snap when the control resizes (e.g. fonts load, the row wraps). The
  // observer's first call reports the initial size, which needs nothing.
  useEffect(() => {
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) first = false;
      else place(false);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="seg" role="group" aria-label={label} ref={ref}>
      <span className="seg-pill" aria-hidden="true" ref={pillRef} hidden />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => option.value !== value && onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
