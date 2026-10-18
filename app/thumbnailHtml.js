import {load} from "cheerio";

function removeEmptyLines(string) {
  const [first, ...rest] = string.split("\n").filter((line) => line.trim() !== "");
  // If the first line ends with <code>, the code is already in the first line.
  if (first.endsWith("<code>")) return first + rest.join("\n");
  return first + "\n" + rest.join("\n");
}

/**
 * The part of Shiki's HTML that a thumbnail shows: the lines from
 * `outputStartLine` on, at most `maxLines` of them when given.
 */
export function thumbnailHtml(html, outputStartLine = null, maxLines = Infinity) {
  if (outputStartLine === null && maxLines === Infinity) return html;
  const $ = load(html);
  const lines = $("span.line");
  const start = outputStartLine === null ? 0 : outputStartLine - 1;
  for (let i = 0; i < lines.length; i++) {
    if (i < start || i >= start + maxLines) $(lines[i]).remove();
  }
  return removeEmptyLines($.html());
}
