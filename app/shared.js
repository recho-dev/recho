import {OUTPUT_MARK} from "../runtime/constant.js";

export const BASE_PATH = "";

// Output lines in JavaScript and MLscript (//➜) and wenyan (批曰。「「➜) notebooks.
const OUTPUT_PREFIXES = [`//${OUTPUT_MARK}`, `批曰。「「${OUTPUT_MARK}`];

/** The runtimes a notebook can have, as stored in its `runtime` field. */
export const RUNTIMES = {
  javascript: "javascript@0.1.0",
  wenyan: "wenyan@0.1.0",
  mlscript: "mlscript@0.1.0",
};

/** The language of a runtime: "wenyan@0.1.0" → "wenyan". */
export function languageOf(runtime = RUNTIMES.javascript) {
  return runtime.split("@")[0];
}

/** A notebook's file extension, by language. */
const EXTENSIONS = {javascript: ".js", wenyan: ".wy", mlscript: ".mls"};

export function extensionOf(runtime) {
  return EXTENSIONS[languageOf(runtime)] ?? ".js";
}

/**
 * The file name a notebook's title stands for: "Box Drawing" → "box-drawing.js".
 * Titles from before notebooks were titled "Untitled" are file names already,
 * so their extension is not added twice.
 */
export function fileNameOf(title, runtime) {
  const extension = extensionOf(runtime);
  const name = title.endsWith(extension) ? title.slice(0, -extension.length) : title;
  const words = name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}_.-]/gu, ""))
    .filter(Boolean);
  return (words.join("-") || "untitled") + extension;
}

/** Shiki's language for highlighting a notebook's code. */
export function highlightLanguage(runtime) {
  const language = languageOf(runtime);
  return language === "javascript" || language === "mlscript" ? language : "text";
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
