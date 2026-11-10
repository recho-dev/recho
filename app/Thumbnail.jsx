/**
 * A card's thumbnail: a code excerpt (HTML from thumbnailHtml), cropped and
 * faded at the right and bottom.
 */
export function Thumbnail({excerpt = ""}) {
  return <div className="thumb-code" dangerouslySetInnerHTML={{__html: excerpt}} />;
}
