"use client";

import {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "next/navigation";
import {Card} from "../../components/Card.jsx";
import {LabelFilters, LANGUAGES} from "./LabelFilters.jsx";
import {BASE_PATH, COMMUNITY_LABEL, languageOf} from "../shared.js";
import {getPublicNotebooks} from "../api.js";
import {NotebookCard} from "./NotebookCard.jsx";

const LANGUAGE_LABELS = {MLscript: "mlscript", Wenyan: "wenyan"};

const languageName = (runtime) => {
  const value = languageOf(runtime);
  return LANGUAGES.find((l) => l.value === value)?.label ?? value;
};

export function ExamplesClient({examples, allLabels}) {
  const searchParams = useSearchParams();
  const [notebooks, setNotebooks] = useState([]);
  const [notebooksError, setNotebooksError] = useState(false);

  // Public notebooks are listed alongside the bundled examples.
  useEffect(() => {
    let cancelled = false;
    getPublicNotebooks()
      .then((notebooks) => !cancelled && setNotebooks(notebooks))
      .catch((error) => {
        console.error("Failed to load public notebooks", error);
        if (!cancelled) setNotebooksError(true);
      });
    return () => (cancelled = true);
  }, []);
  // Older links may carry several labels; a notebook with any of them shows.
  // MLscript and Wenyan used to be labels; those links now pick the language.
  const rawLabels = searchParams.getAll("labels");
  const labels = rawLabels.filter((label) => label !== "All" && !LANGUAGE_LABELS[label]);
  const label = labels.length === 0 ? "All" : labels.length === 1 ? labels[0] : null;
  const language = searchParams.get("lang") ?? rawLabels.map((label) => LANGUAGE_LABELS[label]).find(Boolean) ?? "all";

  // Examples and public notebooks in one list, newest first. Public notebooks
  // are labeled Community.
  const shown = useMemo(() => {
    const ofLanguage = ({runtime}) => language === "all" || languageOf(runtime) === language;
    const listed = labels.length === 0 || labels.includes(COMMUNITY_LABEL);
    return [
      ...examples
        .filter(
          (example) =>
            labels.length === 0 || (Array.isArray(example.label) && labels.some((l) => example.label.includes(l))),
        )
        .filter(ofLanguage)
        .map((example) => ({key: `example-${example.slug}`, date: example.created, example})),
      ...(listed ? notebooks : [])
        .filter(ofLanguage)
        .map((notebook) => ({key: `notebook-${notebook.id}`, date: notebook.listed, notebook})),
    ].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examples, notebooks, labels.join("\n"), language]);

  return (
    <>
      <div className="ex-head">
        <h1 className="page-title">Explore</h1>
        <span className="status">
          {shown.length} notebook{shown.length === 1 ? "" : "s"}
        </span>
        <LabelFilters allLabels={allLabels} label={label} language={language} />
      </div>
      {notebooksError && <p className="status">Community notebooks couldn&apos;t be loaded. Showing examples only.</p>}
      {shown.length === 0 && <p className="status">No notebooks match these filters yet.</p>}
      {/* The new grid is remounted when a filter changes, so its cards play the reveal. */}
      <ul key={`${labels.join(",")}:${language}`} className="card-grid reveal">
        {shown.map(({key, example, notebook}, i) => (
          <li key={key} style={{"--i": i}}>
            {notebook ? (
              <NotebookCard notebook={notebook} aside={language === "all" ? languageName(notebook.runtime) : null} />
            ) : (
              <Card
                href={`/explore/${example.slug}`}
                title={example.title}
                subtitle={`${example.author} · ${example.created}`}
                // With every language shown, each card says which one it is.
                aside={language === "all" ? languageName(example.runtime) : null}
                thumbnail={
                  example.snap ? (
                    <div className="snap" style={{backgroundImage: `url(${BASE_PATH}/examples/${example.snap})`}} />
                  ) : (
                    <div className="thumb-code" dangerouslySetInnerHTML={{__html: example.thumbnail}} />
                  )
                }
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
