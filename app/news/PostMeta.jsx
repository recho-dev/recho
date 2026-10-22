import {formatDate} from "./data.js";

/** Date · author, plus anything passed as children (each starting with a dot). */
export function PostMeta({item, children}) {
  return (
    <div className="post-meta">
      <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
      <Dot />
      <span>{item.author}</span>
      {children}
    </div>
  );
}

export function Dot() {
  return (
    <span className="dot" aria-hidden="true">
      ·
    </span>
  );
}
