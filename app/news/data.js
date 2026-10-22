// Each post lives on Medium. `body` is an optional array of paragraph strings
// shown on the in-app article page; when it is empty the page links to Medium.
export const news = [
  {
    title: "A Lighter Way to Code with Creativity",
    publishedAt: "2025-10-01",
    summary: "Introducing Recho: a light learning and exploration environment.",
    link: "https://medium.com/@subairui/a-lighter-way-to-code-with-creativity-8c0ac739aa6f",
    author: "Bairui Su",
    image: "a-ligter-way-to-code-with-creativity.webp",
    body: [],
    slug: "hello-world",
  },
  {
    title: "Recho 0.2.0: Light Domain-Specific Code Editors for Coders and Artists",
    publishedAt: "2025-10-20",
    summary: "Recho has been renamed to Recho Notebook with a bigger vision.",
    link: "https://medium.com/@subairui/recho-0-2-0-light-domain-specific-code-editors-for-coders-and-artists-b04c2f18af66",
    author: "Bairui Su",
    image: "light-domain-specific-editors.webp",
    body: [],
    slug: "recho-0-2-0",
  },
  {
    title: "CHI 2026: “We Want to Live in the Editor Forever”",
    publishedAt: "2026-04-20",
    summary: "A CHI 2026 recap on Recho and the dream of living inside the editor.",
    link: "https://medium.com/@subairui/chi-2026-sumarry-we-want-to-live-in-the-editor-forever-53bd6e1f42fa",
    author: "Bairui Su",
    image: "chi-2026-editor-forever.webp",
    body: [],
    slug: "chi-2026-editor-forever",
  },
  {
    title: "Coding on Principle: Toolmaking Is the Most Effective Way of Learning",
    publishedAt: "2026-06-29",
    summary: "A principle derived from building Recho for Bairui Su's thesis presentation.",
    link: "https://medium.com/@subairui/coding-on-principle-toolmaking-is-the-most-effective-way-of-learning-12ed34b60d76",
    author: "Bairui Su",
    image: "coding-on-principle.webp",
    body: [],
    slug: "coding-on-principle",
  },
  {
    title: "When Reactivity Meets Terminal UI",
    publishedAt: "2026-08-31",
    summary: "Recho now runs in the terminal, with animations echoed inside your source file.",
    link: "https://medium.com/@chengluyu/when-reactivity-meets-terminal-ui-6994af74af73",
    author: "Luyu Cheng",
    image: "when-reactivity-meets-terminal-ui.webp",
    body: [],
    slug: "when-reactivity-meets-terminal-ui",
  },
];

/** Posts, newest first. */
export const sortedNews = [...news].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-10-20" to "Oct 20, 2025", read as a calendar date so no time zone can shift it. */
export function formatDate(date) {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
