"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {cn} from "../cn.js";

export function LabelFilters({allLabels}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get selected labels from URL searchParams
  const currentLabels = searchParams.getAll("labels");
  const selectedLabels = currentLabels.length > 0 ? currentLabels : [];

  function toggleLabel(label) {
    const params = new URLSearchParams(searchParams.toString());
    const currentLabels = params.getAll("labels");

    if (label === "All") {
      // If "All" is clicked, clear all labels
      params.delete("labels");
    } else {
      // Remove "All" if it exists
      const filteredLabels = currentLabels.filter((l) => l !== "All");

      // Toggle the clicked label
      if (filteredLabels.includes(label)) {
        // Remove the label
        const newLabels = filteredLabels.filter((l) => l !== label);
        if (newLabels.length === 0) {
          // If no labels remain, show all (remove params)
          params.delete("labels");
        } else {
          params.delete("labels");
          newLabels.forEach((l) => params.append("labels", l));
        }
      } else {
        // Add the label
        params.delete("labels");
        [...filteredLabels, label].forEach((l) => params.append("labels", l));
      }
    }

    router.push(`/explore?${params.toString()}`);
  }

  const isAllSelected = selectedLabels.length === 0 || selectedLabels.includes("All");
  const isLabelSelected = (label) => selectedLabels.includes(label);
  const getLabelStyle = (selected) =>
    cn(
      "px-3 py-1 rounded-full text-xs font-medium transition-colors",
      selected ? "bg-green-700 text-white" : "bg-green-100 text-green-700 hover:bg-green-700 hover:text-white",
    );

  return (
    <div className={cn("flex flex-wrap gap-1.5 items-center border-b border-gray-200 pb-4 border-dashed")}>
      <button onClick={() => toggleLabel("All")} className={getLabelStyle(isAllSelected)}>
        All
      </button>
      {allLabels.map((label) => {
        const selected = isLabelSelected(label);
        return (
          <button key={label} onClick={() => toggleLabel(label)} className={getLabelStyle(selected)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
