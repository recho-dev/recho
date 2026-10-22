import {describe, it, expect} from "vitest";
// Not named `md`: Prettier would format the templates as Markdown.
import {md as m, Markdown} from "../runtime/stdlib/md.js";
import {Inspector} from "../runtime/stdlib/inspect.js";
import {makeOutput} from "../runtime/output.js";
import {parse, stripAnsi} from "../lib/ansi.js";

const text = (value) => stripAnsi(String(value));

// The style of the first run whose text includes `needle`.
const styleOf = (value, needle) => parse(String(value)).find((r) => r.text.includes(needle))?.style;

describe("recho.md", () => {
  it("renders headings, emphasis and code in colour", () => {
    const out = m`# Title\n\nSome **bold**, *italic*, ~~struck~~ and \`code\`.`;
    expect(text(out)).toBe("Title\n=====\n\nSome bold, italic, struck and code.");
    expect(styleOf(out, "Title")).toMatchObject({bold: true, fg: 5});
    expect(styleOf(out, "bold")).toMatchObject({bold: true});
    expect(styleOf(out, "italic")).toMatchObject({italic: true});
    expect(styleOf(out, "struck")).toMatchObject({strike: true});
    expect(styleOf(out, "code")).toMatchObject({fg: 1});
  });

  it("keeps nested styles", () => {
    const out = m`**bold *both* bold**`;
    expect(styleOf(out, "both")).toMatchObject({bold: true, italic: true});
    expect(parse(String(out)).at(-1).style).toMatchObject({bold: true, italic: false});
  });

  it("shows a link's address after its text, and an autolink once", () => {
    expect(text(m`See [Recho](https://recho.dev).`)).toBe("See Recho https://recho.dev.");
    expect(styleOf(m`[Recho](https://recho.dev)`, "Recho")).toMatchObject({underline: true, fg: 4});
    expect(text(m`<https://recho.dev>`)).toBe("https://recho.dev");
  });

  it("joins soft line breaks and wraps paragraphs at 80 characters", () => {
    const words = Array.from({length: 30}, (_, i) => `word${i}`).join(" ");
    const lines = text(m`${words}\nmore`).split("\n");
    expect(lines.every((line) => line.length <= 80)).toBe(true);
    expect(lines.at(-1).endsWith("more")).toBe(true);
    expect(lines.join(" ")).toBe(`${words} more`);
  });

  it("keeps hard line breaks", () => {
    expect(text(m`one\\\ntwo`)).toBe("one\ntwo");
  });

  it("renders lists, nested lists and tasks", () => {
    const out = m`
      - one
      - two
        - nested

      1. first
      2. second

      - [x] done
      - [ ] todo
    `;
    expect(text(out)).toBe(
      ["• one", "• two", "  • nested", "", "1. first", "2. second", "", "• [x] done", "• [ ] todo"].join("\n"),
    );
  });

  it("indents wrapped list items and quotes", () => {
    const long = "lorem ipsum ".repeat(10).trim();
    const item = text(m`- ${long}`).split("\n");
    expect(item[0].startsWith("• ")).toBe(true);
    expect(item[1].startsWith("  ")).toBe(true);
    const quote = m`> ${long}`;
    const lines = String(quote).split("\n");
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(parse(line)[0]).toMatchObject({text: " ", style: {bg: 2}});
    expect(styleOf(quote, "lorem")).toMatchObject({italic: true});
  });

  it("draws code blocks on a panel, highlighting JavaScript", () => {
    const out = m`
      \`\`\`js
      const x = 1;
      \`\`\`
    `;
    const lines = text(out).split("\n");
    expect(lines).toEqual(["             js ", "  const x = 1;  ", "                "]);
    expect(styleOf(out, "const")).toMatchObject({bg: "#24292f", fg: "#ff7b72"});
    expect(styleOf(m`\`\`\`\nconst\n\`\`\``, "const")).toMatchObject({fg: "#e6edf3"});
  });

  it("draws tables without box-drawing characters, aligned", () => {
    const out = m`
      | name | n |
      | :--- | ---: |
      | apple | 3 |
      | kiwi | 10 |
    `;
    expect(text(out)).toBe(["| name  |  n |", "|-------|----|", "| apple |  3 |", "| kiwi  | 10 |"].join("\n"));
    expect(styleOf(out, "name")).toMatchObject({bold: true});
  });

  it("decodes entities and shows escapes", () => {
    expect(text(m`a &amp; b &lt; c \\*d\\*`)).toBe("a & b < c *d*");
  });

  it("interpolates strings as Markdown and other values as echo shows them", () => {
    expect(text(m`Hi **${"you"}**, ${[1, 2]} and ${{a: 1}}`)).toBe("Hi you, [ 1, 2 ] and { a: 1 }");
    expect(styleOf(m`${"**x**"}`, "x")).toMatchObject({bold: true});
    const inner = m`*inner*`;
    expect(styleOf(m`- ${inner}`, "inner")).toMatchObject({italic: true});
  });

  it("removes the indentation the template's lines share", () => {
    const out = m`
      # Title

          code
    `;
    // An indented code block: the panel, with no language label.
    expect(text(out)).toBe("Title\n=====\n\n        \n  code  \n        ");
  });

  it("takes a plain string too", () => {
    expect(text(m("**hi**"))).toBe("hi");
  });

  it("is shown by echo as is, without quotes", () => {
    const value = m`plain`;
    expect(value).toBeInstanceOf(Markdown);
    expect(value).toBeInstanceOf(Inspector);
    expect(makeOutput([{values: [value], options: {}}]).output).toBe("//➜ plain");
    expect(makeOutput([{values: [m`**bold**`], options: {}}]).output).toBe("//➜ \x1b[1mbold\x1b[22m");
  });
});
