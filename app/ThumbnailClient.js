import {codeToHtml} from "shiki";
import {useState, useEffect} from "react";
import {Thumbnail} from "./Thumbnail.jsx";

export function ThumbnailClient({code, outputStartLine = null, lang = "javascript"}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    codeToHtml(code, {
      lang,
      theme: "github-light",
    }).then((html) => {
      setHtml(html);
    });
  }, [code, lang]);
  return <>{html ? <Thumbnail html={html} outputStartLine={outputStartLine} /> : <div>Rendering...</div>}</>;
}
