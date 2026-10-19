import {BASE_PATH} from "../shared.js";
import {sortedNews} from "./data.js";
import {NewsLink, NewsRendered} from "./NewsLink.jsx";
import {PostMeta} from "./PostMeta.jsx";

export const metadata = {
  title: "News | Recho Notebook",
  description: "News | Recho Notebook",
};

export default function Page() {
  return (
    <div className="page reading news-view">
      <NewsRendered />
      <div className="ex-head">
        <h1 className="page-title">News</h1>
        <span className="status">{sortedNews.length} posts</span>
      </div>
      <ul className="news-list">
        {sortedNews.map((item) => (
          <li key={item.slug}>
            <NewsLink className="post" href={`/news/${item.slug}`} kind="open" slug={item.slug} data-slug={item.slug}>
              <div>
                <PostMeta item={item} />
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
              </div>
              <img className="cover" src={`${BASE_PATH}/news/${item.image}`} alt="" loading="lazy" />
            </NewsLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
