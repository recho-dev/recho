import {OUTPUT_MARK} from "../runtime/constant.js";

export const BASE_PATH = "";

export function findFirstOutputRange(content) {
  const lines = content.split("\n");
  let startLine = null;
  let endLine = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`//${OUTPUT_MARK}`)) {
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
