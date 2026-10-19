"use client";
import {useState} from "react";
import {usePathname} from "next/navigation";
import {ChevronDown} from "lucide-react";
import {Sidebar} from "../Sidebar.js";
import {Button} from "../../components/Button.jsx";

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

export function DocsLayoutClient({navStructure, docsMap, children}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const slug = pathname.split("/").pop();

  return (
    <div className="page wide">
      <div className="docs">
        <Button
          className="docs-toggle"
          aria-expanded={navOpen}
          aria-controls="docs-side"
          onClick={() => setNavOpen(!navOpen)}
        >
          <span>{currentTrail(navStructure, docsMap, slug)}</span>
          <ChevronDown className="ic" size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <nav className={navOpen ? "side open" : "side"} id="docs-side" aria-label="Docs">
          <Sidebar navStructure={navStructure} docsMap={docsMap} onLinkClick={() => setNavOpen(false)} />
        </nav>
        <div key={pathname} className="doc enter">
          {children}
        </div>
      </div>
    </div>
  );
}
