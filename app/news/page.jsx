import {cn} from "../cn.js";
import {BASE_PATH} from "../shared.js";
import {news} from "./data.js";

export const metadata = {
  title: "News | Recho Notebook",
  description: "News | Recho Notebook",
};

export default function Page() {
  const items = [...news].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return (
    <div className={cn("page news")}>
      <h1 className={cn("page-title")}>News</h1>
      {items.map((item) => (
        <article key={item.title}>
          <a href={item.link} target="_blank" rel="noreferrer">
            <h2>{item.title}</h2>
          </a>
          <p className={cn("status")}>
            {item.author} · {item.publishedAt}
          </p>
          <p>{item.summary}</p>
          <img src={`${BASE_PATH}/news/${item.image}`} alt={item.title} />
        </article>
      ))}
    </div>
  );
}
