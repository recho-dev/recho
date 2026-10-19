import {codeToHtml} from "shiki";
import {codeTheme} from "./codeTheme.js";
import {Thumbnail} from "./Thumbnail.jsx";

export async function ThumbnailServer({code, ...rest}) {
  const html = await codeToHtml(code, {
    lang: "javascript",
    theme: codeTheme,
  });
  return <Thumbnail html={html} {...rest} />;
}
