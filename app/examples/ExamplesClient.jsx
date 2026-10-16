"use client";

import {useMemo} from "react";
import {useSearchParams} from "next/navigation";
import {Meta} from "../Meta.js";
import {ThumbnailClient} from "../ThumbnailClient.js";
import {cn} from "../cn.js";
import {BASE_PATH, highlightLanguage} from "../shared.js";

export function ExamplesClient({examples}) {
  const searchParams = useSearchParams();

  // Get selected labels from URL searchParams
  const selectedLabels = useMemo(() => {
    const labels = searchParams.getAll("labels");
    return labels.length > 0 ? labels : [];
  }, [searchParams]);

  // Filter examples based on selected labels
  const filteredExamples = useMemo(() => {
    if (selectedLabels.length === 0 || selectedLabels.includes("All")) {
      return examples;
    }
    return examples.filter((example) => {
      if (!example.label || !Array.isArray(example.label)) return false;
      return selectedLabels.some((selectedLabel) => example.label.includes(selectedLabel));
    });
  }, [examples, selectedLabels]);

  // Sort examples by date
  const sortedExamples = useMemo(() => {
    return [...filteredExamples].sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [filteredExamples]);

  return (
    <div className={cn("grid gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-10")}>
      {sortedExamples.map((example) => (
        <div key={example.slug}>
          <Meta example={example} />
          <div className={cn("w-full pt-[62.5%] relative  border border-gray-200 rounded-md overflow-hidden")}>
            <div className={cn("absolute inset-0 px-3")}>
              {example.snap ? (
                <div
                  className={cn("w-full h-full bg-cover bg-center")}
                  style={{backgroundImage: `url(${BASE_PATH}/examples/${example.snap})`}}
                />
              ) : (
                <ThumbnailClient
                  code={example.content}
                  outputStartLine={example.outputStartLine}
                  lang={highlightLanguage(example.runtime)}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
