import {describe, it, expect} from "vitest";
import {getAllJSExamples} from "../app/utils.js";
import {exampleThumbnail} from "../app/examples/thumbnails.js";

const examples = getAllJSExamples();
const bySlug = (slug) => examples.find((example) => example.slug === slug);

describe("example thumbnails", () => {
  it("highlights MLscript examples with the tree-sitter grammar", async () => {
    const example = bySlug("mlscript-clock");
    const html = await exampleThumbnail(example);
    expect(html).toContain(
      '<pre class="shiki recho" style="background-color:var(--clear);color:var(--ink)" tabindex="0">',
    );
    expect(html).toContain('<span style="color:var(--syn-keyword)">val</span>');
    expect(html).toContain('<span style="color:var(--syn-keyword)">fun</span><span style="color:var(--ink)"> </span>');
    expect(html).toContain('<span style="color:var(--syn-string)">"Seconds since opening:"</span>');
    expect(html).toContain('<span style="color:var(--syn-number)">2</span>');
    expect(html).toContain(
      '<span style="color:var(--syn-comment)">// The current time, once per animation frame.</span>',
    );
    expect(html).toContain(
      '<span class="line out first last"><span style="color:var(--syn-comment)">//➜ Seconds since opening: 0</span></span>',
    );
    const lines = html.match(/<span class="line[ "]/g) ?? [];
    const shown = example.content.split("\n").length - example.outputStartLine + 1;
    expect(lines.length).toBe(Math.min(shown, 60));
  });

  it("highlights JavaScript examples", async () => {
    const html = await exampleThumbnail(bySlug("addition"));
    expect(html).toContain('class="shiki recho"');
    expect(html).toMatch(/color:var\(--syn-(keyword|number|function)\)/);
  });

  it("starts at the first output line and keeps at most 60 lines", async () => {
    const example = bySlug("mlscript-sorting");
    const html = await exampleThumbnail(example);
    const lines = html.match(/<span class="line[ "]/g) ?? [];
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(60);
    const firstShown = example.content.split("\n")[example.outputStartLine - 1].trim();
    expect(html.replace(/<[^>]+>/g, "")).toContain(firstShown.slice(0, 3));
  });

  it("skips examples with a snapshot image", async () => {
    expect(await exampleThumbnail({...bySlug("addition"), snap: "x.png"})).toBeNull();
  });
});
