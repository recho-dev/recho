"use client";

import {useMemo} from "react";
import {useSearchParams} from "next/navigation";
import {Card} from "../../components/Card.jsx";
import {LabelFilters} from "./LabelFilters.jsx";
import {BASE_PATH, languageOf} from "../shared.js";

export function ExamplesClient({examples, allLabels}) {
  const searchParams = useSearchParams();
  // Older links may carry several labels; a notebook with any of them shows.
  const labels = searchParams.getAll("labels").filter((label) => label !== "All");
  const label = labels.length === 0 ? "All" : labels.length === 1 ? labels[0] : null;
  const language = searchParams.get("lang") ?? "all";

  const shown = useMemo(
    () =>
      examples
        .filter(
          (example) =>
            labels.length === 0 || (Array.isArray(example.label) && labels.some((l) => example.label.includes(l))),
        )
        .filter((example) => language === "all" || languageOf(example.runtime) === language)
        .sort((a, b) => new Date(b.created) - new Date(a.created)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [examples, labels.join("\n"), language],
  );

  return (
    <>
      <div className="ex-head">
        <h1 className="page-title">Examples</h1>
        <span className="status">
          {shown.length} notebook{shown.length === 1 ? "" : "s"}
        </span>
        <LabelFilters allLabels={allLabels} label={label} language={language} />
      </div>
      {shown.length === 0 && <p className="status">No examples match these filters yet.</p>}
      {/* The new grid fades in when a filter changes. Cards don't move to new places. */}
      <ul key={`${labels.join(",")}:${language}`} className="card-grid fade-in">
        {shown.map((example) => (
          <li key={example.slug}>
            <Card
              href={`/examples/${example.slug}`}
              title={example.title}
              subtitle={`${example.author} · ${example.created}`}
              thumbnail={
                example.snap ? (
                  <div className="snap" style={{backgroundImage: `url(${BASE_PATH}/examples/${example.snap})`}} />
                ) : (
                  <div className="thumb-code" dangerouslySetInnerHTML={{__html: example.thumbnail}} />
                )
              }
            />
          </li>
        ))}
      </ul>
    </>
  );
}
