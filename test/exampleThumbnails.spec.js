import {describe, it, expect} from "vitest";
import {getAllJSExamples} from "../app/utils.js";
import {exampleThumbnail} from "../app/examples/thumbnails.js";

const examples = getAllJSExamples();
const bySlug = (slug) => examples.find((example) => example.slug === slug);

describe("example thumbnails", () => {
  it("highlights MLscript examples with the MLscript grammar", async () => {
    const html = await exampleThumbnail(bySlug("mlscript-clock"));
    expect(html).toContain('<span style="color:#D73A49">val</span>');
  });

  it("highlights JavaScript examples", async () => {
    const html = await exampleThumbnail(bySlug("addition"));
    expect(html).toContain('class="shiki github-light"');
    expect(html).toMatch(/color:#(D73A49|005CC5|6F42C1)/);
  });

  it("starts at the first output line and keeps at most 60 lines", async () => {
    const example = bySlug("mlscript-sorting");
    const html = await exampleThumbnail(example);
    const lines = html.match(/<span class="line">/g) ?? [];
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(60);
    const firstShown = example.content.split("\n")[example.outputStartLine - 1].trim();
    expect(html.replace(/<[^>]+>/g, "")).toContain(firstShown.slice(0, 3));
  });

  it("skips examples with a snapshot image", async () => {
    expect(await exampleThumbnail({...bySlug("addition"), snap: "x.png"})).toBeNull();
  });
});
