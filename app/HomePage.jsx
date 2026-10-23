"use client";
import {useEffect, useState} from "react";
import Link from "next/link";
import {ChevronRight} from "lucide-react";
import {SafeLink} from "./SafeLink.jsx";
import {ThumbnailClient} from "./ThumbnailClient.js";
import {NotebookCard} from "./explore/NotebookCard.jsx";
import {getNotebooks, getPublicNotebooks, starterContent, VISIBILITIES} from "./api.js";
import {COMMUNITY_LABEL, LANGUAGES, findFirstOutputRange, highlightLanguage, languageName} from "./shared.js";
import {cn} from "../components/cn.js";
import {Button} from "../components/Button.jsx";
import {Card} from "../components/Card.jsx";

// Two rows of recent notebooks at the widest, so the community row stays in
// reach however many notebooks there are. The rest are on /works.
const RECENT = 10;
const COMMUNITY = 5;

const chevron = {size: 14, strokeWidth: 1.75, className: "ic", "aria-hidden": true};

function useLoad(load, deps) {
  const [state, setState] = useState({data: null, error: null});
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState({data: null, error: null});
    load()
      .then((data) => !cancelled && setState({data, error: null}))
      .catch((error) => {
        console.error(error);
        if (!cancelled) setState({data: null, error});
      });
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  return {...state, reload: () => setReloadKey((key) => key + 1)};
}

/** What a logged-in user sees at "/": templates, their recent notebooks and the community's. */
export function HomePage({user}) {
  const recent = useLoad(getNotebooks, [user.uid]);
  const community = useLoad(getPublicNotebooks, []);
  const others = community.data?.filter((notebook) => notebook.ownerId !== user.uid).slice(0, COMMUNITY) ?? [];

  useEffect(() => {
    document.title = "Recho";
  }, []);

  return (
    <div className={cn("home")}>
      <section className={cn("home-band")} aria-labelledby="home-start">
        <div className={cn("home-in")}>
          <div className={cn("home-head")}>
            <h2 className={cn("home-title")} id="home-start">
              Start a new notebook
            </h2>
            <Link className={cn("home-more")} href="/explore">
              Browse examples
              <ChevronRight {...chevron} />
            </Link>
          </div>
          <ul className={cn("home-templates")}>
            {LANGUAGES.map(({value, runtime, label}) => (
              <li key={value} className={cn("card")}>
                <SafeLink href={`/new?lang=${value}`} newRuntime={runtime} className={cn("card-link")}>
                  <span className={cn("thumb")} aria-hidden="true" inert>
                    <ThumbnailClient code={starterContent(runtime)} lang={highlightLanguage(runtime)} />
                  </span>
                  <span className={cn("t")}>{label}</span>
                </SafeLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn("home-in home-section")} aria-labelledby="home-recent">
        <div className={cn("home-head")}>
          <h2 className={cn("home-title")} id="home-recent">
            Recent notebooks
          </h2>
          {recent.data?.length > 0 && <span className={cn("status")}>Last edited · {recent.data.length} in all</span>}
          {recent.data?.length > 0 && (
            <Link className={cn("home-more")} href="/works">
              See all
              <ChevronRight {...chevron} />
            </Link>
          )}
        </div>
        {recent.error ? (
          <div className={cn("home-note")}>
            <p>Failed to load notebooks.</p>
            <Button onClick={recent.reload}>Retry</Button>
          </div>
        ) : recent.data === null ? (
          <p className={cn("status")}>Loading…</p>
        ) : recent.data.length === 0 ? (
          <p className={cn("home-note")}>No notebooks yet. Start one from a template above.</p>
        ) : (
          <ul className={cn("card-grid home-grid")}>
            {recent.data.slice(0, RECENT).map((notebook) => (
              <li key={notebook.id}>
                <Card
                  href={`/works/${notebook.id}`}
                  title={notebook.title}
                  subtitle={`${VISIBILITIES.find((v) => v.value === notebook.visibility)?.label ?? "Private"} · Edited ${new Date(notebook.updated ?? notebook.created).toLocaleDateString("en-CA")}`}
                  aside={languageName(notebook.runtime)}
                  thumbnail={
                    <ThumbnailClient
                      code={notebook.content}
                      lang={highlightLanguage(notebook.runtime)}
                      outputStartLine={findFirstOutputRange(notebook.content).startLine}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hidden when there is nothing to show; Explore reports its own errors. */}
      {others.length > 0 && (
        <section className={cn("home-in home-section home-community")} aria-labelledby="home-community">
          <div className={cn("home-head")}>
            <h2 className={cn("home-title")} id="home-community">
              From the community
            </h2>
            <span className={cn("status")}>Recently made public</span>
            <Link className={cn("home-more")} href={`/explore?labels=${COMMUNITY_LABEL}`}>
              See all in Explore
              <ChevronRight {...chevron} />
            </Link>
          </div>
          <ul className={cn("card-grid home-grid home-row")}>
            {others.map((notebook) => (
              <li key={notebook.id}>
                <NotebookCard notebook={notebook} aside={languageName(notebook.runtime)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
