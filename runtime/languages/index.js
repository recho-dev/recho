/**
 * Each file here is a language. A language tells the runtime how to turn a
 * notebook's code into cells of JavaScript, and how to write output back into
 * the code. Everything in between (`let` support, echo, the Observable
 * runtime) is shared.
 *
 * - `id`: the language name, as in a notebook's `runtime` ("javascript@0.1.0").
 * - `output`: how output is written into the code (see JAVASCRIPT_OUTPUT in
 *   ../output.js).
 * - `cells(code)`: the top-level cells, as `{start, end, js}`: their range in
 *   `code` and their JavaScript. Throws on a syntax error.
 * - `errorOffset(code, error)`: where in `code` to show an error `cells` threw.
 * - `isHiddenOutput(name)`: whether a name a cell declares stays private to it
 *   instead of becoming a variable other cells can use.
 */

import {javascript} from "./javascript.js";

/**
 * The language for a notebook's `runtime` ("javascript@0.1.0",
 * "wenyan@0.1.0"). Other languages are loaded on demand, so JavaScript
 * notebooks don't download their compilers. Rejects a language this version
 * of Recho doesn't know, rather than running the code as something else.
 */
export async function loadLanguage(runtime = "javascript") {
  const id = runtime.split("@")[0];
  if (id === "javascript") return javascript;
  if (id === "wenyan") return (await import("./wenyan.js")).wenyan;
  throw new Error(`Unknown language "${runtime}". It may need a newer version of Recho.`);
}
