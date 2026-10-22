"use client";
import {useEffect, useLayoutEffect} from "react";
import {usePathname, useRouter} from "next/navigation";
import {ChevronDown} from "lucide-react";
import {Sidebar} from "../Sidebar.js";
import {Button} from "../../components/Button.jsx";
import {usePopover} from "../../components/usePopover.js";

/** Where the current page sits in the nav: "Features / Inline echoing". */
function currentTrail(navStructure, docsMap, slug) {
  for (const entry of navStructure) {
    if (entry.type === "group") {
      if (entry.slug === slug) return `${entry.title} / Overview`;
      if (entry.items.some((page) => page.slug === slug)) return `${entry.title} / ${docsMap[slug]?.title ?? slug}`;
    } else if (entry.slug === slug) {
      return docsMap[slug]?.title ?? slug;
    }
  }
  return "Docs";
}

// A sidebar click crossfades the doc: the old one fades out while the new one
// rises in (its own .enter). The router push runs inside a view transition
// whose update ends when the new doc has mounted. Back, Forward and browsers
// without the API get the rise alone. The .docs-switch class scopes the
// ::view-transition rules to this, so other transitions keep their own.
let pending = null;
let switches = 0;

function switchDoc(router, href) {
  pending?.(); // A newer click wins; let the older transition end.
  const root = document.documentElement;
  root.classList.add("docs-switch");
  const id = ++switches;
  const vt = document.startViewTransition(
    () =>
      new Promise((resolve) => {
        // A newer click came before this update ran: leave the push to it.
        if (id !== switches) return resolve();
        const finish = () => {
          clearTimeout(timer);
          if (pending === finish) pending = null;
          resolve();
        };
        // If the page is slow, end the transition rather than freeze the old one.
        const timer = setTimeout(finish, 1500);
        pending = finish;
        router.push(href);
      }),
  );
  vt.finished.finally(() => id === switches && root.classList.remove("docs-switch"));
}

export function DocsLayoutClient({navStructure, docsMap, children}) {
  const pathname = usePathname();
  const router = useRouter();
  // Below 1100px the sidebar is a menu over the doc: a click outside it or
  // Escape closes it.
  const {open: navOpen, setOpen: setNavOpen, ref: navRef, triggerRef} = usePopover();
  const slug = pathname.split("/").pop();

  // Close the mobile nav when the page changes (a link, Back or Forward).
  useEffect(() => setNavOpen(false), [pathname]);

  // The new doc is in the DOM: let a pending crossfade run.
  useLayoutEffect(() => pending?.(), [pathname]);

  // Capture phase, so this runs before the Link's own navigation.
  function onNavClick(event) {
    const link = event.target.closest("a[href]");
    const href = link?.getAttribute("href");
    if (
      !href ||
      href === pathname ||
      !document.startViewTransition ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    switchDoc(router, href);
  }

  return (
    <div className="page wide">
      <div className="docs">
        <div className="docs-nav" ref={navRef}>
          <Button
            ref={triggerRef}
            className="docs-toggle"
            aria-expanded={navOpen}
            aria-controls="docs-side"
            onClick={() => setNavOpen(!navOpen)}
          >
            <span>{currentTrail(navStructure, docsMap, slug)}</span>
            <ChevronDown className="ic" size={14} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <nav className={navOpen ? "side open" : "side"} id="docs-side" aria-label="Docs" onClickCapture={onNavClick}>
            <Sidebar navStructure={navStructure} docsMap={docsMap} onLinkClick={() => setNavOpen(false)} />
          </nav>
        </div>
        <div key={pathname} className="doc enter">
          {children}
        </div>
      </div>
    </div>
  );
}
