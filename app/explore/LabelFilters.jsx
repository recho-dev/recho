"use client";

import {useLayoutEffect, useMemo, useRef, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Segmented} from "../../components/Segmented.jsx";
import {Listbox} from "../../components/Listbox.jsx";
import {LANGUAGES} from "../shared.js";

const LANGUAGE_OPTIONS = [
  {value: "all", label: "All languages"},
  ...LANGUAGES.map(({value, label}) => ({value, label})),
];

/** The label filter and language switcher of the Explore page, kept in the URL. */
export function LabelFilters({allLabels, label, language}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const labelOptions = useMemo(() => ["All", ...allLabels].map((value) => ({value, label: value})), [allLabels]);
  const labelSelectOptions = useMemo(
    () => labelOptions.map((option) => (option.value === "All" ? {...option, label: "All labels"} : option)),
    [labelOptions],
  );

  // Whether the label segments fit on one row; null until measured, when the
  // stylesheet's breakpoint decides. The segments stay in the page, out of
  // sight, while the select shows, so they can still be measured.
  const filtersRef = useRef(null);
  const labelsRef = useRef(null);
  const [fits, setFits] = useState(null);

  useLayoutEffect(() => {
    const row = filtersRef.current?.parentElement;
    const seg = labelsRef.current?.querySelector(".seg");
    if (!row || !seg) return;
    const measure = () => {
      const style = getComputedStyle(seg);
      const buttons = [...seg.querySelectorAll("button")];
      const width =
        buttons.reduce((sum, button) => sum + button.getBoundingClientRect().width, 0) +
        (buttons.length - 1) * parseFloat(style.columnGap || 0) +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);
      setFits(width <= row.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [labelOptions]);

  function update(key, value, fallback) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === fallback) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.push(query ? `/explore?${query}` : "/explore", {scroll: false});
  }

  return (
    <div ref={filtersRef} className="ex-filters" data-fit={fits === null ? undefined : fits ? "yes" : "no"}>
      {/* The labels are a row of segments, or a select where that row would
          wrap. */}
      <div ref={labelsRef} className="ex-labels" inert={fits === false} aria-hidden={fits === false || undefined}>
        <Segmented
          label="Filter by label"
          options={labelOptions}
          value={label}
          onChange={(value) => update("labels", value, "All")}
        />
      </div>
      <div className="ex-labels-select">
        <Listbox
          label="Filter by label"
          options={labelSelectOptions}
          value={label}
          onChange={(value) => update("labels", value, "All")}
        />
      </div>
      <Listbox
        label="Notebook language"
        options={LANGUAGE_OPTIONS}
        value={language}
        align="right"
        onChange={(value) => update("lang", value, "all")}
      />
    </div>
  );
}
