import {parseModule} from "./parse.js";
import {JAVASCRIPT_OUTPUT} from "./output.js";

/**
 * A language tells the runtime how to turn a notebook's code into cells of
 * JavaScript, and how to write output back into the code. Everything in
 * between (`let` support, echo, the Observable runtime) is shared.
 *
 * - `id`: the language name, as in a notebook's `runtime` ("javascript@0.1.0").
 * - `output`: how output is written into the code (see JAVASCRIPT_OUTPUT).
 * - `cells(code)`: the top-level cells, as `{start, end, js}`: their range in
 *   `code` and their JavaScript. Throws on a syntax error.
 * - `errorOffset(code, error)`: where in `code` to show an error `cells` threw.
 * - `isHiddenOutput(name)`: whether a name a cell declares stays private to it
 *   instead of becoming a variable other cells can use.
 */
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

/**
 * The language for a notebook's `runtime` ("javascript@0.1.0",
 * "wenyan@0.1.0"). Other languages are loaded on demand, so JavaScript
 * notebooks don't download their compilers.
 */
export async function loadLanguage(runtime = "javascript") {
  const id = runtime.split("@")[0];
  if (id === "wenyan") return (await import("./wenyan/index.js")).wenyan;
  return javascript;
}
