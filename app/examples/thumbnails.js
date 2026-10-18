import {codeToHtml} from "shiki";
import mlscriptGrammar from "../../editor/languages/mlscript/mlscript.tmLanguage.json";
import {highlightLanguage} from "../shared.js";
import {thumbnailHtml} from "../thumbnailHtml.js";

// A card shows about 15 lines; keep a margin for wide screens.
const MAX_THUMBNAIL_LINES = 60;

const LANGUAGES = {mlscript: {...mlscriptGrammar, name: "mlscript"}};

/**
 * Highlights the part of an example a card shows, at build time, so the
 * examples page needs neither Shiki nor any grammar in the browser.
 */
export async function exampleThumbnail({content, runtime, outputStartLine, snap}) {
  if (snap) return null;
  const lang = highlightLanguage(runtime);
  const html = await codeToHtml(content, {lang: LANGUAGES[lang] ?? lang, theme: "github-light"});
  return thumbnailHtml(html, outputStartLine, MAX_THUMBNAIL_LINES);
}
