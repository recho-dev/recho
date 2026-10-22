"use client";
import {useEffect, useLayoutEffect} from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {ChevronDown, ChevronLeft, ChevronRight} from "lucide-react";
import {Sidebar} from "../Sidebar.js";
import {Button} from "../../components/Button.jsx";
import {usePopover} from "../../components/usePopover.js";

/** Every page in reading order, with the group it is listed under. */
function pagesInOrder(navStructure, docsMap) {
  const pages = [];
  const add = (slug, group) => docsMap[slug] && pages.push({slug, title: docsMap[slug].title, group});
  for (const entry of navStructure) {
    if (entry.type === "group") {
      if (entry.slug) add(entry.slug, entry.title);
      for (const page of entry.items) add(page.slug, entry.title);
    } else {
      add(entry.slug, null);
    }
  }
  return pages;
}

/** A step to the page before or after, or a disabled button at either end. */
function StepLink({page, label, children}) {
  if (!page) {
    return (
      <Button variant="ghost" icon disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button as={Link} variant="ghost" icon href={`/docs/${page.slug}`} tip={`${label}: ${page.title}`}>
      {children}
    </Button>
  );
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
  const pages = pagesInOrder(navStructure, docsMap);
  const index = pages.findIndex((page) => page.slug === slug);
  const page = pages[index];

  // Close the mobile nav when the page changes (a link, Back or Forward).
  useEffect(() => setNavOpen(false), [pathname, setNavOpen]);

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
        {/* Below 1100px the doc's title is this menu button, with steps to the
            pages either side; the doc's own title is hidden. */}
        <div className="docs-nav" ref={navRef} onClickCapture={onNavClick}>
          <div className="docs-head">
            <div className="docs-group">{page?.group ?? "Docs"}</div>
            <div className="docs-head-row">
              <h1 className="page-title">
                <button
                  ref={triggerRef}
                  type="button"
                  className="docs-title"
                  aria-expanded={navOpen}
                  aria-controls="docs-side"
                  onClick={() => setNavOpen(!navOpen)}
                >
                  <span>{page?.title ?? "Docs"}</span>
                  <ChevronDown className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </h1>
              {page && (
                <span className="docs-count">
                  {index + 1} / {pages.length}
                </span>
              )}
              <StepLink page={pages[index - 1]} label="Previous">
                <ChevronLeft className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />
              </StepLink>
              <StepLink page={index < 0 ? undefined : pages[index + 1]} label="Next">
                <ChevronRight className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />
              </StepLink>
            </div>
          </div>
          <nav className={navOpen ? "side open" : "side"} id="docs-side" aria-label="Docs">
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
