import Link from "next/link";

/** A link in a side navigation. The current page is marked with `current`. */
export function SidebarItem({href, current = false, children, ...props}) {
  return (
    <Link href={href} className="side-item" aria-current={current ? "page" : undefined} {...props}>
      {children}
    </Link>
  );
}

/** A heading over a group of sidebar items. */
export function SidebarGroup({children}) {
  return <div className="side-group">{children}</div>;
}
