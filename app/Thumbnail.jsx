import {BASE_PATH} from "./shared.js";
import {thumbnailHtml} from "./thumbnailHtml.js";

/**
 * A card's thumbnail: a snapshot image, or a code excerpt from the first
 * output line, cropped and faded at the right and bottom.
 */
export function Thumbnail({html, outputStartLine = null, snap = null}) {
  if (snap) return <div className="snap" style={{backgroundImage: `url(${BASE_PATH}/examples/${snap})`}} />;
  return <div className="thumb-code" dangerouslySetInnerHTML={{__html: thumbnailHtml(html, outputStartLine)}} />;
}
