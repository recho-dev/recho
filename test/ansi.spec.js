import {describe, it, expect} from "vitest";
import {
  DEFAULT_STYLE,
  cssColor,
  hasSGR,
  normalize,
  padEnd,
  parse,
  stripAnsi,
  styleToCss,
  truncate,
  visibleLength,
} from "../lib/ansi.js";
import {makeOutput} from "../runtime/output.js";

const red = (s) => `\x1b[31m${s}\x1b[39m`;

describe("lib/ansi", () => {
  it("finds SGR sequences", () => {
    expect(hasSGR(red("x"))).toBe(true);
    expect(hasSGR("plain")).toBe(false);
    expect(hasSGR("\x1b[2J")).toBe(false);
  });

  it("measures and pads by visible characters", () => {
    expect(visibleLength(red("abc"))).toBe(3);
    expect(stripAnsi(`a${red("b")}c\x1b]8;;http://x\x07d\x1b]8;;\x07`)).toBe("abcd");
    expect(padEnd(red("ab"), 4)).toBe(red("ab") + "  ");
  });

  it("parses styles into merged runs", () => {
    const runs = parse("\x1b[1;31mA\x1b[31mB\x1b[0mC");
    expect(runs.map((r) => r.text)).toEqual(["AB", "C"]);
    expect(runs[0].style).toMatchObject({bold: true, fg: 1});
    expect(runs[1].style).toBe(DEFAULT_STYLE);
  });

  it("parses 256 colours, truecolor and backgrounds", () => {
    const [a, b, c, d] = parse("\x1b[38;5;196ma\x1b[38;2;255;128;0mb\x1b[48;5;4;97mc\x1b[38:2::1:2:3md");
    expect(a.style.fg).toBe(196);
    expect(b.style.fg).toBe("#ff8000");
    expect(c.style).toMatchObject({fg: 15, bg: 4});
    expect(d.style.fg).toBe("#010203");
  });

  it("keeps only SGR and drops redundant codes", () => {
    expect(normalize("\x1b[2J\x1b[H\x1b[31m\x1b[31mA\x1b[39m\x1b[39m")).toBe(red("A"));
    expect(normalize("\x1b]8;;http://x\x07link\x1b]8;;\x07")).toBe("link");
    expect(normalize("\x1b[1m\x1b[22m")).toBe("");
    expect(normalize("\x1b[1;31mA\x1b[0m")).toBe("\x1b[1;31mA\x1b[0m");
  });

  it("makes each line self-contained", () => {
    expect(normalize("\x1b[31ma\nb\x1b[39m")).toBe(`${red("a")}\n${red("b")}`);
  });

  it("truncates by visible characters, never inside a sequence", () => {
    const string = `\x1b[38;2;10;20;30m${"x".repeat(10)}\x1b[39m`;
    expect(truncate(string, 4)).toBe("\x1b[38;2;10;20;30mxxxx\x1b[39m…");
    expect(truncate(string, 10)).toBe(string);
  });

  it("styles runs with palette tokens or RGB", () => {
    expect(cssColor(1)).toBe("var(--ansi-red)");
    expect(cssColor(9)).toBe("var(--ansi-bright-red)");
    expect(cssColor(196)).toBe("#ff0000");
    expect(cssColor(232)).toBe("#080808");
    expect(styleToCss(DEFAULT_STYLE)).toBe("");
    const [run] = parse("\x1b[1;3;4;9;31;42mx");
    expect(styleToCss(run.style)).toBe(
      "color:var(--ansi-red);background-color:var(--ansi-green);font-weight:bold;font-style:italic;text-decoration:underline line-through;",
    );
  });
});

describe("makeOutput with SGR", () => {
  const output = (...values) => makeOutput([{options: {}, values}]).output;

  it("prints a coloured string unquoted", () => {
    expect(output(red("RED"))).toBe(`//➜ ${red("RED")}`);
  });

  it("keeps strings in objects escaped", () => {
    expect(output([red("x")])).toBe('//➜ [ "\\x1B[31mx\\x1B[39m" ]');
  });

  it("pads merged values by visible width", () => {
    expect(output(red("RED"), "a\nb")).toBe(`//➜ ${red("RED")} a\n//➜     b`);
  });

  it("cuts long coloured strings at 200 visible characters", () => {
    const line = output(`\x1b[32m${"x".repeat(300)}`);
    expect(visibleLength(line)).toBe("//➜ ".length + 200 + 1);
    expect(line.endsWith("\x1b[39m…")).toBe(true);
  });

  it("aligns tables with coloured cells", () => {
    const {output} = makeOutput([
      {options: {key: "a"}, values: [red("RED")]},
      {options: {key: "b"}, values: ["plain"]},
    ]);
    const widths = output.split("\n").map(visibleLength);
    expect(new Set(widths).size).toBe(1);
  });
});
