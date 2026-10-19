import {codeToHtml} from "shiki";
import {useState, useEffect} from "react";
import {Thumbnail} from "./Thumbnail.jsx";

let mlscript = null;

/**
 * Highlights MLscript with the editor's tree-sitter grammar, which is loaded
 * only when an MLscript thumbnail is shown.
 */
function mlscriptHighlighter() {
  return (mlscript ??= Promise.all([
    import("../editor/languages/mlscript/grammar.js"),
    import("../editor/languages/mlscript/highlight.js"),
  ])
    .then(async ([{loadGrammar}, {createHighlighter}]) => {
      const {language, query} = await loadGrammar();
      return createHighlighter(language, query);
    })
    .catch((error) => {
      mlscript = null;
      throw error;
    }));
}

function highlight(code, lang) {
  if (lang === "mlscript") return mlscriptHighlighter().then((highlight) => highlight(code));
  return codeToHtml(code, {lang, theme: "github-light"});
}

export function ThumbnailClient({code, outputStartLine = null, lang = "javascript"}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    highlight(code, lang).then((html) => {
      setHtml(html);
    });
  }, [code, lang]);
  return <>{html ? <Thumbnail html={html} outputStartLine={outputStartLine} /> : <div>Rendering...</div>}</>;
}
