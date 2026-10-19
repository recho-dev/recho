import {compactDecoration} from "./compact.ts";
import {debugDecoration} from "./debug.ts";
export {blockIndicator} from "./indicators.ts";
import {outputDecoration, outputLines} from "./output.ts";
import {blockMetadataExtension} from "./state.ts";

export const blockExtensions = [
  // This field tracks the output lines; the output widgets draw them.
  outputLines,
  outputDecoration,
  // This extension tracks the metdata of each block.
  blockMetadataExtension,
  // This view plugin loads the typefaces blocks ask for.
  compactDecoration,
  // The block indicator gutter is not part of this list on purpose: it is
  // exported separately and spliced into the basic setup by editor/index.js,
  // so that the gutter appears at the right position among the built-in ones.
];

// Only enable debug decoration in the test environment.
if (process.env.NODE_ENV === "test") {
  blockExtensions.push(debugDecoration);
}
