"use client";

import {Card} from "../../components/Card.jsx";
import {ThumbnailClient} from "../ThumbnailClient.js";
import {findFirstOutputRange, highlightLanguage} from "../shared.js";

/** A public notebook on the Explore page, shaped like an example's card. */
export function NotebookCard({notebook, aside = null}) {
  const name = notebook.author?.name ?? "Anonymous";
  return (
    <Card
      href={`/works/${notebook.id}`}
      title={notebook.title}
      subtitle={`${name} · ${new Date(notebook.listed ?? notebook.created).toLocaleDateString("en-CA")}`}
      aside={aside}
      thumbnail={
        <ThumbnailClient
          code={notebook.content}
          lang={highlightLanguage(notebook.runtime)}
          outputStartLine={findFirstOutputRange(notebook.content).startLine}
        />
      }
    />
  );
}
