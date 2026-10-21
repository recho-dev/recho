"use client";

import Link from "next/link";
import {CircleUser} from "lucide-react";
import {ThumbnailClient} from "../ThumbnailClient.js";
import {COMMUNITY_LABEL, findFirstOutputRange, highlightLanguage} from "../shared.js";
import {cn} from "../cn.js";

/** A public notebook on the Explore page, shaped like an example's card. */
export function NotebookCard({notebook, frameClassName}) {
  const name = notebook.author?.name ?? "Anonymous";
  const photoURL = notebook.author?.photoURL;
  return (
    <div>
      <div className={cn("mb-3")}>
        <div className={cn("flex items-center gap-2")}>
          {photoURL ? (
            <img src={photoURL} alt={name} referrerPolicy="no-referrer" className={cn("w-8 h-8 rounded-full")} />
          ) : (
            <CircleUser className={cn("w-8 h-8 text-gray-400")} />
          )}
          <div className={cn("min-w-0")}>
            <div className={cn("flex items-center gap-2 ellipsis line-clamp-1")}>
              <span>{name}</span>
              <span> / </span>
              <Link href={`/works/${notebook.id}`} className={cn("text-blue-500 hover:underline font-semibold")}>
                <span>{notebook.title}</span>
              </Link>
            </div>
            <div className={cn("text-sm text-gray-500")}>Created {new Date(notebook.created).toLocaleDateString()}</div>
          </div>
        </div>
        <div className={cn("flex flex-wrap gap-1.5 mt-3")}>
          <span className={cn("text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700")}>
            {COMMUNITY_LABEL}
          </span>
        </div>
      </div>
      <div className={frameClassName}>
        <div className={cn("absolute inset-0 px-3")}>
          <ThumbnailClient
            code={notebook.content}
            lang={highlightLanguage(notebook.runtime)}
            outputStartLine={findFirstOutputRange(notebook.content).startLine}
          />
        </div>
      </div>
    </div>
  );
}
