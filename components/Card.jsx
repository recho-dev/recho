import Link from "next/link";

/**
 * An item in a grid of notebooks: a thumbnail, a title and a quiet subtitle,
 * all one link.
 * `aside` is a short note at the right end of the subtitle line.
 */
export function Card({href, title, subtitle, thumbnail, aside = null}) {
  return (
    <div className="card">
      <Link href={href} className="card-link">
        {/* Inert, so the code inside (Shiki's <pre tabindex="0">) is no tab stop. */}
        <span className="thumb" aria-hidden="true" inert>
          {thumbnail}
        </span>
        <span className="t">{title}</span>
        {(subtitle || aside) && (
          <span className="s">
            <span className="s-main">{subtitle}</span>
            {aside && <span className="s-aside">{aside}</span>}
          </span>
        )}
      </Link>
    </div>
  );
}
