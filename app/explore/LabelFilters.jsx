"use client";

import {useMemo} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Segmented} from "../../components/Segmented.jsx";
import {Listbox} from "../../components/Listbox.jsx";

export const LANGUAGES = [
  {value: "all", label: "All languages"},
  {value: "javascript", label: "JavaScript"},
  {value: "wenyan", label: "文言 wenyan"},
  {value: "mlscript", label: "MLscript"},
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

  function update(key, value, fallback) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === fallback) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.push(query ? `/explore?${query}` : "/explore", {scroll: false});
  }

  return (
    <div className="ex-filters">
      {/* The labels are a row of segments, or a select where that row would
          wrap; CSS shows one of the two. */}
      <div className="ex-labels">
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
        options={LANGUAGES}
        value={language}
        align="right"
        onChange={(value) => update("lang", value, "all")}
      />
    </div>
  );
}
