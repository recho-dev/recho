import {cn} from "./cn.js";
import {BASE_PATH} from "./shared.js";
import {thumbnailHtml} from "./thumbnailHtml.js";

export function Thumbnail({html, outputStartLine = null, snap = null}) {
  if (outputStartLine === null) return <div dangerouslySetInnerHTML={{__html: html}} />;
  if (snap) {
    return (
      <div
        className={cn("w-full h-full bg-cover bg-center")}
        style={{backgroundImage: `url(${BASE_PATH}/examples/${snap})`}}
      />
    );
  }
  return (
    <div dangerouslySetInnerHTML={{__html: thumbnailHtml(html, outputStartLine)}} className={cn("w-full h-full")} />
  );
}
