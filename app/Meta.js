import {cn} from "./cn.js";

/** An example's title, author, date and labels, above its notebook. */
export function Meta({example}) {
  const labels = Array.isArray(example.label) ? example.label : [];
  return (
    <div className={cn("ex-meta")}>
      <h1 className={cn("page-title")}>{example.title}</h1>
      <p className={cn("status")}>
        <a href={`https://github.com/${example.github}`} target="_blank" rel="noreferrer">
          {example.author}
        </a>
        {" · "}Created {example.created}
        {labels.length > 0 && ` · ${labels.join(", ")}`}
      </p>
    </div>
  );
}
