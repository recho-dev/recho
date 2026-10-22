import {TitleSection} from "./TitleSection.jsx";

/** An example's title, author, date and labels, above its notebook. */
export function Meta({example, actions = null}) {
  const labels = Array.isArray(example.label) ? example.label : [];
  return (
    <TitleSection
      title={<h1 className="page-title">{example.title}</h1>}
      details={
        <>
          <a href={`https://github.com/${example.github}`} target="_blank" rel="noreferrer">
            {example.author}
          </a>
          {" · "}Created {example.created}
          {labels.length > 0 && ` · ${labels.join(", ")}`}
        </>
      }
      actions={actions}
    />
  );
}
