import {Parser, Language} from "web-tree-sitter";

// The tree-sitter grammar and its highlights query, from the
// @mlscript/tree-sitter-mlscript package. They are fetched only by MLscript
// notebooks and thumbnails of MLscript works, and only once.
const GRAMMAR_URL = new URL("@mlscript/tree-sitter-mlscript/tree-sitter-mlscript.wasm", import.meta.url);
const QUERY_URL = new URL("@mlscript/tree-sitter-mlscript/queries/highlights.scm", import.meta.url);

let loading = null;

/**
 * Loads the grammar and the source of its highlights query in the browser.
 * @returns {Promise<{language: Language, query: string}>}
 */
export function loadGrammar() {
  return (loading ??= (async () => {
    const [, query] = await Promise.all([Parser.init(), fetch(QUERY_URL).then((r) => r.text())]);
    const language = await Language.load(new Uint8Array(await (await fetch(GRAMMAR_URL)).arrayBuffer()));
    return {language, query};
  })().catch((error) => {
    loading = null;
    throw error;
  }));
}
