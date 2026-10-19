"use client";
import {useLayoutEffect, useRef} from "react";

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

  useLayoutEffect(() => {
    const seg = ref.current;
    const pill = pillRef.current;
    function place(animate) {
      const on = seg.querySelector('button[aria-pressed="true"]');
      if (!on) {
        pill.hidden = true;
        seg.classList.remove("has-pill");
        return;
      }
      pill.hidden = false;
      seg.classList.add("has-pill");
      if (!animate) pill.style.transition = "none";
      pill.style.translate = `${on.offsetLeft}px ${on.offsetTop}px`;
      pill.style.width = `${on.offsetWidth}px`;
      if (!animate) {
        void pill.offsetWidth;
        pill.style.transition = "";
      }
    }
    place(placed.current);
    placed.current = true;
    const observer = new ResizeObserver(() => place(false));
    observer.observe(seg);
    return () => observer.disconnect();
  }, [value, options]);

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
