import {BASE_PATH} from "./shared.js";

/**
 * A card's thumbnail: a snapshot image, or a code excerpt (HTML from
 * thumbnailHtml), cropped and faded at the right and bottom.
 */
export function Thumbnail({excerpt = "", snap = null}) {
  if (snap) return <div className="snap" style={{backgroundImage: `url(${BASE_PATH}/examples/${snap})`}} />;
  return <div className="thumb-code" dangerouslySetInnerHTML={{__html: excerpt}} />;
}
