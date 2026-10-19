"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useLayoutEffect} from "react";

// News list <-> post: the clicked row's cover and title move to their place on
// the new page (View Transitions, named news-cover and news-title) and the rest
// crossfades. Between two posts it is a plain crossfade. Without the API the
// new page fades in on its own (see .news-view in components.css). With reduced
// motion nothing is named, so it is a plain crossfade too.
//
// Next's client navigation is a soft navigation, so CSS @view-transition never
// fires. Instead the router push runs inside document.startViewTransition, and
// the update callback resolves once the new page has mounted (NewsRendered).

let listScroll = 0;
let onRendered = null;

const NAMES = ["news-cover", "news-title"];

function rowParts(slug) {
  const row = document.querySelector(`.post[data-slug="${CSS.escape(slug)}"]`);
  return row ? [row.querySelector(".cover"), row.querySelector("h2")] : [];
}

function articleParts() {
  return [document.querySelector(".article .cover"), document.querySelector(".article h1")];
}

function name(parts, on) {
  parts.forEach((el, i) => el && (el.style.viewTransitionName = on ? NAMES[i] : ""));
}

function reducedMotion() {
  return getComputedStyle(document.documentElement).getPropertyValue("--motion-reduce").trim() === "1";
}

/**
 * A link between news pages. `kind` is "open" (list row to its post), "close"
 * (post back to the list; `slug` is the post being left) or "post" (post to
 * another post).
 */
export function NewsLink({href, kind, slug, children, ...props}) {
  const router = useRouter();

  function onClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const opening = kind === "open";
    const closing = kind === "close";
    if (opening) listScroll = window.scrollY;

    // Push the route and resolve once the new page has mounted, with the
    // scroll position already set (top for a post, where it was for the list).
    const navigate = (afterRender) =>
      new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          onRendered = null;
          window.scrollTo(0, closing ? listScroll : 0);
          afterRender?.();
          resolve();
        };
        onRendered = finish;
        // Never hold the page frozen if the new route is slow to arrive.
        setTimeout(finish, 1500);
        router.push(href, {scroll: false});
      });

    if (!document.startViewTransition) {
      navigate();
      return;
    }

    const travel = (opening || closing) && !reducedMotion();
    const oldParts = travel ? (opening ? rowParts(slug) : articleParts()) : [];
    name(oldParts, true);
    const vt = document.startViewTransition(() => {
      name(oldParts, false);
      return navigate(() => travel && name(closing ? rowParts(slug) : articleParts(), true));
    });
    vt.finished.finally(() => {
      name(articleParts(), false);
      if (slug) name(rowParts(slug), false);
    });
  }

  return (
    <Link href={href} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}

/** Rendered by each news page: tells a pending transition the new page is in the DOM. */
export function NewsRendered() {
  useLayoutEffect(() => {
    onRendered?.();
  }, []);
  return null;
}
