import {codeToHtml} from "shiki";
import {useState, useEffect} from "react";
import {Thumbnail} from "./Thumbnail.jsx";

/** Shiki's language input: MLscript's grammar is loaded only for MLscript thumbnails. */
async function shikiLanguage(lang) {
  if (lang !== "mlscript") return lang;
  const {default: grammar} = await import("../editor/languages/mlscript/mlscript.tmLanguage.json");
  return {...grammar, name: "mlscript"};
}

export function ThumbnailClient({code, outputStartLine = null, lang = "javascript"}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    shikiLanguage(lang)
      .then((lang) => codeToHtml(code, {lang, theme: "github-light"}))
      .then((html) => {
        setHtml(html);
      });
  }, [code, lang]);
  return <>{html ? <Thumbnail html={html} outputStartLine={outputStartLine} /> : <div>Rendering...</div>}</>;
}
