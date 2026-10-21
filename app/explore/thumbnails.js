import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {codeToHtml} from "shiki";
import {Parser, Language} from "web-tree-sitter";
import {createHighlighter} from "../../editor/languages/mlscript/highlight.js";
import {highlightLanguage} from "../shared.js";
import {thumbnailHtml} from "../thumbnailHtml.js";

// A card shows about 15 lines; keep a margin for wide screens.
const MAX_THUMBNAIL_LINES = 60;

let mlscript = null;

/**
 * Highlights MLscript with the tree-sitter grammar, read from the packages in
 * node_modules (resolved from the project, as this module is bundled).
 */
function mlscriptHighlighter() {
  return (mlscript ??= (async () => {
    const {resolve} = createRequire(path.join(process.cwd(), "package.json"));
    const runtime = resolve("web-tree-sitter/web-tree-sitter.wasm");
    await Parser.init({locateFile: () => runtime});
    const grammar = resolve("@mlscript/tree-sitter-mlscript/tree-sitter-mlscript.wasm");
    const [wasm, query] = await Promise.all([
      readFile(grammar),
      readFile(path.join(path.dirname(grammar), "queries/highlights.scm"), "utf8"),
    ]);
    return createHighlighter(await Language.load(new Uint8Array(wasm)), query);
  })());
}

/**
 * Highlights the part of an example a card shows, at build time, so the
 * examples page needs neither Shiki nor any grammar in the browser.
 */
export async function exampleThumbnail({content, runtime, outputStartLine, snap}) {
  if (snap) return null;
  const lang = highlightLanguage(runtime);
  const html =
    lang === "mlscript"
      ? (await mlscriptHighlighter())(content)
      : await codeToHtml(content, {lang, theme: "github-light"});
  return thumbnailHtml(html, outputStartLine, MAX_THUMBNAIL_LINES);
}
