"use client";

import {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "next/navigation";
import {Meta} from "../Meta.js";
import {cn} from "../cn.js";
import {BASE_PATH, COMMUNITY_LABEL} from "../shared.js";
import {getPublicNotebooks} from "../api.js";
import {NotebookCard} from "./NotebookCard.jsx";

const cardFrame = cn("w-full pt-[62.5%] relative border border-gray-200 rounded-md overflow-hidden");

export function ExamplesClient({examples}) {
  const searchParams = useSearchParams();
  const [notebooks, setNotebooks] = useState([]);

  // Public notebooks are listed alongside the bundled examples.
  useEffect(() => {
    let cancelled = false;
    getPublicNotebooks()
      .then((notebooks) => !cancelled && setNotebooks(notebooks))
      .catch((error) => console.error("Failed to load public notebooks", error));
    return () => (cancelled = true);
  }, []);

  // Get selected labels from URL searchParams
  const selectedLabels = useMemo(() => {
    const labels = searchParams.getAll("labels");
    return labels.length > 0 ? labels : [];
  }, [searchParams]);

  // Filter examples based on selected labels. Public notebooks are labeled Community.
  const cards = useMemo(() => {
    const showAll = selectedLabels.length === 0 || selectedLabels.includes("All");
    const filteredExamples = showAll
      ? examples
      : examples.filter((example) => {
          if (!example.label || !Array.isArray(example.label)) return false;
          return selectedLabels.some((selectedLabel) => example.label.includes(selectedLabel));
        });
    const showNotebooks = showAll || selectedLabels.includes(COMMUNITY_LABEL);
    return [
      ...filteredExamples.map((example) => ({key: `example-${example.slug}`, created: example.created, example})),
      ...(showNotebooks ? notebooks : []).map((notebook) => ({
        key: `notebook-${notebook.id}`,
        created: notebook.created,
        notebook,
      })),
    ].sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [examples, notebooks, selectedLabels]);

  return (
    <div className={cn("grid gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-10")}>
      {cards.map(({key, example, notebook}) =>
        notebook ? (
          <NotebookCard key={key} notebook={notebook} frameClassName={cardFrame} />
        ) : (
          <div key={key}>
            <Meta example={example} />
            <div className={cardFrame}>
              <div className={cn("absolute inset-0 px-3")}>
                {example.snap ? (
                  <div
                    className={cn("w-full h-full bg-cover bg-center")}
                    style={{backgroundImage: `url(${BASE_PATH}/examples/${example.snap})`}}
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{__html: example.thumbnail}} className={cn("w-full h-full")} />
                )}
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
