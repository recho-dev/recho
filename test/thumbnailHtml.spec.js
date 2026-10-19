import {it, expect} from "vitest";
import {thumbnailHtml} from "../app/thumbnailHtml.js";

const shiki = (...lines) =>
  `<pre class="shiki"><code>${lines.map((line) => `<span class="line"><span style="color:#999">${line}</span></span>`).join("\n")}</code></pre>`;

it("draws SGR colours in output lines as styled spans", () => {
  const html = thumbnailHtml(shiki("//➜ \x1b[31mRED\x1b[39m plain", 'echo(chalk.red("RED"));'));
  expect(html).toContain(
    '<span class="line out first last"><span>//➜</span><span> </span><span class="ansi" style="color:var(--ansi-red);">RED</span><span> plain</span></span>',
  );
  expect(html).not.toContain("\x1b");
});

it("leaves uncoloured output lines as Shiki wrote them", () => {
  const html = thumbnailHtml(shiki("//➜ 42", "echo(42);"));
  expect(html).toContain('<span class="line out first last"><span style="color:#999">//➜ 42</span></span>');
});
