/**
 * @title Markdown Renderer
 * @author Luyu Cheng
 * @created 2026-10-21
 * @tui true
 */

/**
 * ============================================================================
 * =                          Markdown Renderer                               =
 * ============================================================================
 *
 * Output can have colour, so a notebook can render Markdown the way a
 * terminal does: headings, emphasis, code, lists, quotes, links and tables,
 * all as coloured text. The renderer below is about eighty lines. Edit the
 * Markdown under it and run the notebook to see the change.
 */

const chalk = recho.require("chalk");

/**
 * Inline spans. Code spans are cut out first, so nothing inside them is
 * styled. Links keep their address on show, and the editor makes it clickable.
 */

function inline(text) {
  return text
    .split(/(`[^`]+`)/)
    .map((part, i) => {
      if (i % 2) return chalk.red(part.slice(1, -1));
      return part
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => chalk.blue.underline(label) + chalk.dim(` ${url}`))
        .replace(/\*\*([^*]+)\*\*/g, (_, s) => chalk.bold(s))
        .replace(/\*([^*]+)\*/g, (_, s) => chalk.italic(s))
        .replace(/~~([^~]+)~~/g, (_, s) => chalk.strikethrough(s));
    })
    .join("");
}

/**
 * Code blocks sit on a dark panel, with keywords, strings and numbers in
 * colour. Backgrounds fill the whole row, so the panel has no seams.
 */

const KEYWORDS = /^(const|let|var|function|return|if|else|for|of|in|new|while)$/;

function highlight(line) {
  return line.replace(/("[^"]*"|'[^']*')|\b([A-Za-z_]\w*)\b|\b(\d+)\b/g, (token, string, word, number) => {
    if (string) return chalk.hex("#a5d6ff")(token);
    if (word && KEYWORDS.test(word)) return chalk.hex("#ff7b72")(token);
    if (number) return chalk.hex("#79c0ff")(token);
    return token;
  });
}

function codeBlock(lines, language) {
  const width = Math.max(language.length, ...lines.map((line) => line.length)) + 4;
  const panel = chalk.bgHex("#24292f").hex("#e6edf3");
  const top = panel(chalk.hex("#8b949e")(language.padStart(width - 1) + " "));
  const rows = lines.map((line) => panel("  " + highlight(line.padEnd(width - 2))));
  return [top, ...rows, panel(" ".repeat(width))];
}

/**
 * Tables are drawn with box-drawing characters, each column as wide as its
 * widest cell, the header in bold.
 */

function table(lines) {
  const rows = lines
    .filter((line) => !/^\|[\s:|-]+\|$/.test(line))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()));
  const widths = rows[0].map((_, j) => Math.max(...rows.map((row) => row[j].length)));
  const rule = (l, m, r) => chalk.dim(l + widths.map((w) => "─".repeat(w + 2)).join(m) + r);
  const bar = chalk.dim("│");
  const row = (cells, style) => bar + cells.map((cell, j) => ` ${style(cell.padEnd(widths[j]))} `).join(bar) + bar;
  const [head, ...body] = rows;
  return [
    rule("┌", "┬", "┐"),
    row(head, chalk.bold),
    rule("├", "┼", "┤"),
    ...body.map((cells) => row(cells, (s) => s)),
    rule("└", "┴", "┘"),
  ];
}

/**
 * Blocks, one source line at a time. Line breaks stay where the source has
 * them, so keep paragraph lines short. The notes below use no box-drawing
 * characters: Recho shows output with them as ASCII art, rows packed tight,
 * which suits the tables below but not prose.
 */

function render(markdown) {
  const lines = markdown.trim().split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code = [];
      while (++i < lines.length && !lines[i].startsWith("```")) code.push(lines[i]);
      out.push(...codeBlock(code, line.slice(3).trim()));
    } else if (line.startsWith("|")) {
      const rows = [line];
      while (lines[i + 1]?.startsWith("|")) rows.push(lines[++i]);
      out.push(...table(rows));
    } else if (line.startsWith("# ")) {
      const text = line.slice(2).toUpperCase();
      out.push(chalk.bold.magenta(text), chalk.magenta("=".repeat(text.length)));
    } else if (/^#{2,6} /.test(line)) {
      out.push(chalk.bold.cyan(line.replace(/^#+ /, "")));
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      out.push(chalk.dim("-".repeat(60)));
    } else if (/^[-*] /.test(line)) {
      out.push("  " + chalk.yellow("•") + " " + inline(line.slice(2)));
    } else if (/^\d+\. /.test(line)) {
      const [, n, text] = line.match(/^(\d+)\. (.*)/);
      out.push("  " + chalk.yellow(n + ".") + " " + inline(text));
    } else if (line.startsWith("> ")) {
      out.push(chalk.bgGreen(" ") + " " + chalk.italic(inline(line.slice(2))));
    } else {
      out.push(inline(line));
    }
  }
  return out.join("\n");
}

/**
 * ============================================================================
 * =                             A Document                                   =
 * ============================================================================
 */

const doc = `
# Release Notes

Recho prints output as **text**, right below the code that made it.
With colour, that text can be *styled*, ~~plain~~ and even \`chalk\`-made.

## What changed

- Output keeps its ANSI colours
- Backgrounds fill the whole row
- Links like [recho.dev](https://recho.dev) open in a new tab

## How to try it

1. Load chalk with \`recho.require\`
2. Pass a coloured string to \`echo\`
3. Run the notebook

> Output is part of the program, so it should read well too.

\`\`\`js
const chalk = recho.require("chalk");
echo(chalk.red("RED"));
\`\`\`
`;

//➜ [1;35mRELEASE NOTES[0m                                                   
//➜ [35m=============[39m                                                   
//➜                                                                 
//➜ Recho prints output as [1mtext[22m, right below the code that made it. 
//➜ With colour, that text can be [3mstyled[23m, [9mplain[29m and even [31mchalk[39m-made.
//➜                                                                 
//➜ [1;36mWhat changed[0m                                                    
//➜                                                                 
//➜   [33m•[39m Output keeps its ANSI colours                               
//➜   [33m•[39m Backgrounds fill the whole row                              
//➜   [33m•[39m Links like [4;34mrecho.dev[24;2;39m https://recho.dev[22m open in a new tab    
//➜                                                                 
//➜ [1;36mHow to try it[0m                                                   
//➜                                                                 
//➜   [33m1.[39m Load chalk with [31mrecho.require[39m                              
//➜   [33m2.[39m Pass a coloured string to [31mecho[39m                             
//➜   [33m3.[39m Run the notebook                                           
//➜                                                                 
//➜ [42m [49m [3mOutput is part of the program, so it should read well too.[23m    
//➜                                                                 
//➜ [38;2;139;148;158;48;2;36;41;47m                                      js [0m                       
//➜ [38;2;230;237;243;48;2;36;41;47m  [38;2;255;123;114mconst[38;2;230;237;243m chalk = recho.require([38;2;165;214;255m"chalk"[38;2;230;237;243m);  [0m                       
//➜ [38;2;230;237;243;48;2;36;41;47m  echo(chalk.red([38;2;165;214;255m"RED"[38;2;230;237;243m));                [0m                       
//➜ [38;2;230;237;243;48;2;36;41;47m                                         [0m                       
echo(render(doc));

/**
 * ============================================================================
 * =                           Tables from Data                               =
 * ============================================================================
 *
 * The renderer takes any string, so Markdown can be built from values. Here a
 * table of the words used most in the notes above.
 */

const words = doc
  .toLowerCase()
  .match(/[a-z]{5,}/g)
  .reduce((counts, word) => counts.set(word, (counts.get(word) ?? 0) + 1), new Map());

const top = [...words].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 5);

//➜ [2m┌─────────────┬───────┐[22m
//➜ [2m│[22m [1mword       [22m [2m│[22m [1mcount[22m [2m│[22m
//➜ [2m├─────────────┼───────┤[22m
//➜ [2m│[22m recho       [2m│[22m 5     [2m│[22m
//➜ [2m│[22m chalk       [2m│[22m 5     [2m│[22m
//➜ [2m│[22m output      [2m│[22m 3     [2m│[22m
//➜ [2m│[22m require     [2m│[22m 2     [2m│[22m
//➜ [2m│[22m backgrounds [2m│[22m 1     [2m│[22m
//➜ [2m└─────────────┴───────┘[22m
echo(render(["| word | count |", "| --- | --- |", ...top.map(([word, n]) => `| ${word} | ${n} |`)].join("\n")));
