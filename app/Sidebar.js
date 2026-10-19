"use client";
import {usePathname} from "next/navigation";
import {SidebarItem, SidebarGroup} from "../components/SidebarItem.jsx";

/** The docs navigation: pages, and groups of pages under a heading. */
export function Sidebar({navStructure, docsMap, onLinkClick}) {
  const pathname = usePathname();
  const item = (slug, title) => {
    const doc = docsMap[slug];
    if (!doc) return null;
    return (
      <SidebarItem key={slug} href={`/docs/${slug}`} current={pathname === `/docs/${slug}`} onClick={onLinkClick}>
        {title ?? doc.title}
      </SidebarItem>
    );
  };
  return navStructure.map((entry) =>
    entry.type === "group" ? (
      <div key={entry.slug || entry.title} role="group" aria-label={entry.title}>
        <SidebarGroup>{entry.title}</SidebarGroup>
        {entry.slug && item(entry.slug, "Overview")}
        {entry.items.map((page) => item(page.slug))}
      </div>
    ) : (
      item(entry.slug)
    ),
  );
}
