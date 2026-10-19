import {notFound} from "next/navigation";
import {ArrowLeft, ArrowUpRight} from "lucide-react";
import {BASE_PATH} from "../../shared.js";
import {news, sortedNews, formatDate} from "../data.js";
import {NewsLink, NewsRendered} from "../NewsLink.jsx";
import {PostMeta, Dot} from "../PostMeta.jsx";

function find(slug) {
  return news.find((item) => item.slug === slug);
}

export async function generateStaticParams() {
  return news.map((item) => ({slug: item.slug}));
}

export async function generateMetadata({params}) {
  const {slug} = await params;
  const post = find(slug);
  if (!post) notFound();
  return {
    title: `${post.title} | Recho Notebook`,
    description: post.summary,
  };
}

export default async function Page({params}) {
  const {slug} = await params;
  const post = find(slug);
  if (!post) notFound();
  const body = post.body ?? [];

  return (
    <div className="page news-page">
      <NewsRendered />
      <article className="article">
        <NewsLink className="back" href="/news" kind="close" slug={post.slug}>
          <ArrowLeft size={15} aria-hidden="true" />
          News
        </NewsLink>
        <PostMeta item={post}>
          <Dot />
          <a href={post.link} target="_blank" rel="noreferrer">
            Medium
          </a>
        </PostMeta>
        <h1>{post.title}</h1>
        <p className="lede">{post.summary}</p>
        <img className="cover" src={`${BASE_PATH}/news/${post.image}`} alt="" />
        {body.length ? (
          <>
            <div className="article-body">
              {body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <p className="original">
              <a href={post.link} target="_blank" rel="noreferrer">
                Originally published on Medium
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </p>
          </>
        ) : (
          <div className="read-on">
            <p>The full post is on Medium.</p>
            <a className="btn btn-primary" href={post.link} target="_blank" rel="noreferrer">
              Read on Medium
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        )}
        <section className="more" aria-labelledby="more-news">
          <h2 id="more-news">More news</h2>
          <ul>
            {sortedNews
              .filter((other) => other !== post)
              .map((other) => (
                <li key={other.slug}>
                  <NewsLink href={`/news/${other.slug}`} kind="post">
                    <time dateTime={other.publishedAt}>{formatDate(other.publishedAt)}</time>
                    <span>{other.title}</span>
                  </NewsLink>
                </li>
              ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
