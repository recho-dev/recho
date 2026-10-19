import Link from "next/link";

/**
 * An item in a grid of notebooks: a thumbnail, a title and a quiet subtitle,
 * all one link. `actions` (e.g. a delete button) sit next to the title.
 */
export function Card({href, title, subtitle, thumbnail, actions = null}) {
  return (
    <div className={actions ? "card has-actions" : "card"}>
      <Link href={href} className="card-link">
        <span className="thumb" aria-hidden="true">
          {thumbnail}
        </span>
        <span className="t">{title}</span>
        {subtitle && <span className="s">{subtitle}</span>}
      </Link>
      {actions && <div className="card-actions">{actions}</div>}
    </div>
  );
}
