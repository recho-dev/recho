"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useLayoutEffect} from "react";

// News list <-> post: the clicked row's cover and title move to their place on
// the new page (View Transitions, named news-cover and news-title) and the rest
// crossfades. Between two posts it is a plain crossfade. Without the API the
// new page fades in on its own (see .news-page in components.css). With reduced
// motion nothing is named, so it is a plain crossfade too.
//
// Next's client navigation is a soft navigation, so CSS @view-transition never
// fires. Instead the router push runs inside document.startViewTransition, and
// the update callback resolves once the new page has mounted (NewsRendered).

// Where the list was scrolled when a post was opened from it, and which post.
// Back restores the scroll only to the list that post was opened from.
let listScroll = 0;
let openedFrom = null;
// Set by a click, read by the next news page to mount: where to scroll.
let arriving = null;
// Ends the pending transition's update callback; true once the page is in.
let pending = null;

const NAMES = ["news-cover", "news-title"];

function rowParts(slug) {
  const row = document.querySelector(`.post[data-slug="${CSS.escape(slug)}"]`);
  return row ? [row.querySelector(".cover"), row.querySelector("h2")] : [];
}

function articleParts() {
  return [document.querySelector(".article .cover"), document.querySelector(".article h1")];
}

function inView(parts) {
  return parts.some((el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  });
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
    const restore = closing && openedFrom === slug;
    if (opening) listScroll = window.scrollY;
    openedFrom = opening ? slug : null;
    arriving = {scroll: restore ? listScroll : 0};
    pending?.(false); // A newer click wins; let the older transition end.

    // Push the route and resolve once the new page has mounted (NewsRendered
    // has scrolled it by then). If it is slow, end the transition without
    // touching the old page; the scroll still happens when the page mounts.
    const navigate = (afterRender) =>
      new Promise((resolve) => {
        let done = false;
        const finish = (rendered) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (pending === finish) pending = null;
          if (rendered) afterRender?.();
          resolve();
        };
        const timer = setTimeout(() => finish(false), 1500);
        pending = finish;
        router.push(href, {scroll: false});
      });

    if (!document.startViewTransition) {
      navigate();
      return;
    }

    const travel = (opening || closing) && !reducedMotion();
    const oldParts = travel ? (opening ? rowParts(slug) : articleParts()) : [];
    if (travel && !inView(oldParts)) oldParts.length = 0;
    name(oldParts, true);
    const vt = document.startViewTransition(() => {
      name(oldParts, false);
      return navigate(() => {
        if (!oldParts.length) return;
        const newParts = closing ? rowParts(slug) : articleParts();
        // A row scrolled out of view would fly in from off screen; let it crossfade.
        if (inView(newParts)) name(newParts, true);
      });
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

/**
 * Rendered by each news page. Arriving from a NewsLink, it sets the scroll and
 * tells a pending transition the page is in the DOM. Arriving any other way
 * (Nav, history, a fresh load), Back no longer has a list scroll to restore.
 */
export function NewsRendered() {
  useLayoutEffect(() => {
    if (arriving) {
      window.scrollTo(0, arriving.scroll);
      arriving = null;
    } else {
      openedFrom = null;
    }
    pending?.(true);
  }, []);
  return null;
}
