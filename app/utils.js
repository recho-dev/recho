import fs from "fs";
import path from "path";
import {findFirstOutputRange, languageOf, RUNTIMES} from "./shared.js";

function parseJSMeta(content) {
  const match = content.match(/^\/\*\*([\s\S]*?)\*\//);
  if (!match) return null;
  const block = match[1];
  const meta = {};
  for (const line of block.split("\n")) {
    const m = line.match(/@(\w+)\s+(.*)/);
    if (m) {
      const key = m[1];
      const value = m[2].trim();
      // Parse @label as comma-separated values
      if (key === "label") {
        meta[key] = value
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
      } else {
        meta[key] = value;
      }
    }
  }
  return meta;
}

export function removeJSMeta(content) {
  return content.replace(/^\/\*\*([\s\S]*?)\*\//, "").trimStart();
}

// Wenyan examples (*.recho.wy) start with metadata comments like
// 注曰。「「@title 方圓」」。
const WENYAN_META = /^注曰。「「@(\w+)\s+(.*?)」」。$/;

function parseWenyanMeta(content) {
  const meta = {};
  for (const line of content.split("\n")) {
    const m = line.match(WENYAN_META);
    if (!m) break;
    const [, key, value] = m;
    meta[key] =
      key === "label"
        ? value
            .split(",")
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
        : value.trim();
  }
  return Object.keys(meta).length ? meta : null;
}

function removeWenyanMeta(content) {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && WENYAN_META.test(lines[i])) i++;
  return lines.slice(i).join("\n").trimStart();
}

/** An example's code without its metadata header. */
export function removeMeta(example) {
  return languageOf(example.runtime) === "wenyan" ? removeWenyanMeta(example.content) : removeJSMeta(example.content);
}

const EXAMPLE_FORMATS = [
  {extension: ".recho.js", runtime: RUNTIMES.javascript, parseMeta: parseJSMeta},
  {extension: ".recho.wy", runtime: RUNTIMES.wenyan, parseMeta: parseWenyanMeta},
  // MLscript has /* */ comments, so its examples have the same header as JavaScript's.
  {extension: ".recho.mls", runtime: RUNTIMES.mlscript, parseMeta: parseJSMeta},
];

export function getAllJSDocs() {
  const dir = path.join(process.cwd(), "app/docs/");
  const files = fs.readdirSync(dir);
  return files
    .filter((file) => file.endsWith(".recho.js"))
    .map((file) => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const meta = parseJSMeta(content);
      return {...meta, content, slug: file.replace(".recho.js", "")};
    });
}

export function getAllJSExamples() {
  const dir = path.join(process.cwd(), "app/examples");
  const files = fs.readdirSync(dir);
  return files.flatMap((file) => {
    const format = EXAMPLE_FORMATS.find(({extension}) => file.endsWith(extension));
    if (!format) return [];
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    const meta = format.parseMeta(content);
    const {startLine, endLine} = findFirstOutputRange(content);
    const slug = file.replace(format.extension, "");
    if (!meta) {
      throw new Error(`No meta found in ${file}`);
    }
    return [
      {
        ...meta,
        content,
        slug,
        runtime: format.runtime,
        outputStartLine: meta.thumbnail_start ?? startLine,
        outputEndLine: endLine,
        snap: meta.snap ?? null,
      },
    ];
  });
}
