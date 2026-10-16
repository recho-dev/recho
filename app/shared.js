import {OUTPUT_MARK} from "../runtime/constant.js";

export const BASE_PATH = "";

// Output lines in JavaScript (//➜) and wenyan (批曰。「「➜) notebooks.
const OUTPUT_PREFIXES = [`//${OUTPUT_MARK}`, `批曰。「「${OUTPUT_MARK}`];

/** The runtimes a notebook can have, as stored in its `runtime` field. */
export const RUNTIMES = {
  javascript: "javascript@0.1.0",
  wenyan: "wenyan@0.1.0",
};

/** The language of a runtime: "wenyan@0.1.0" → "wenyan". */
export function languageOf(runtime = RUNTIMES.javascript) {
  return runtime.split("@")[0];
}

/** Shiki's language for highlighting a notebook's code. */
export function highlightLanguage(runtime) {
  return languageOf(runtime) === "wenyan" ? "text" : "javascript";
}

export function findFirstOutputRange(content) {
  const lines = content.split("\n");
  let startLine = null;
  let endLine = null;
  for (let i = 0; i < lines.length; i++) {
    if (OUTPUT_PREFIXES.some((prefix) => lines[i].startsWith(prefix))) {
      if (startLine === null) startLine = i + 1;
      else endLine = i + 1;
    } else {
      if (startLine !== null) {
        endLine = i + 1;
        break;
      }
    }
  }
  if (startLine !== null && endLine === null) {
    endLine = lines.length;
  }
  return {startLine, endLine};
}
