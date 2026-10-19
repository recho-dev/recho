"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {Segmented} from "../../components/Segmented.jsx";
import {Listbox} from "../../components/Listbox.jsx";

const LANGUAGES = [
  {value: "all", label: "All languages"},
  {value: "javascript", label: "JavaScript"},
  {value: "wenyan", label: "文言 wenyan"},
  {value: "mlscript", label: "MLscript"},
];

/** The label filter and language switcher of the examples page, kept in the URL. */
export function LabelFilters({allLabels, label, language}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key, value, fallback) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === fallback) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.push(query ? `/examples?${query}` : "/examples", {scroll: false});
  }

  return (
    <>
      <Segmented
        label="Filter by label"
        options={["All", ...allLabels].map((value) => ({value, label: value}))}
        value={label}
        onChange={(value) => update("labels", value, "All")}
      />
      <Listbox
        label="Notebook language"
        options={LANGUAGES}
        value={language}
        align="right"
        onChange={(value) => update("lang", value, "all")}
      />
    </>
  );
}
