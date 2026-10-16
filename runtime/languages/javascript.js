import {parseModule} from "../parse.js";
import {JAVASCRIPT_OUTPUT} from "../output.js";

/** JavaScript, Recho's original language. See ./index.js. */
export const javascript = {
  id: "javascript",
  output: JAVASCRIPT_OUTPUT,
  cells(code) {
    // The `parse` call here is actually unnecessary. Parsing the entire code
    // is quite expensive. If we can perform the splitting operation through
    // the editor's syntax tree, we can save the parsing here.
    return parseModule(code).body.map(({start, end}) => ({start, end, js: code.slice(start, end)}));
  },
  errorOffset(code, error) {
    // The start of the line the syntax error is on.
    const loc = error.loc;
    const prevLine = code.split("\n").slice(0, loc.line - 1);
    const offset = loc.line === 1 ? 0 : 1;
    return prevLine.join("\n").length + offset;
  },
  isHiddenOutput: () => false,
};
