/**
 * Each file here is a language. A language tells the runtime how to turn a
 * notebook's code into cells of JavaScript (or, lower-level, into reactive
 * nodes), and how to write output back into the code. Everything in between
 * (echo, the Observable runtime, and for cells `let` support) is shared.
 *
 * - `id`: the language name, as in a notebook's `runtime` ("javascript@0.1.0").
 * - `output`: how output is written into the code (see JAVASCRIPT_OUTPUT in
 *   ../output.js).
 * - `cells(code)`: the top-level cells, as `{start, end, js}`: their range in
 *   `code` and their JavaScript. Throws on a syntax error.
 * - `nodes(code)` (instead of `cells`): for a compiled language that already
 *   knows what each top-level part reads and defines. The parts, as
 *   `{key, start, end, inputs, outputs, hiddenOutputs?, body, error?}`:
 *   - `key`: its identity across runs. A node whose key and body are
 *     unchanged keeps its variables and state, so only changed nodes and the
 *     nodes that read from them re-run.
 *   - `start`, `end`: its range in `code`; its output goes above `start`.
 *   - `inputs`: the names it reads (other nodes' outputs, `recho`, builtins).
 *   - `outputs`: the names it defines for other nodes to read.
 *   - `hiddenOutputs`: names it defines that other nodes can read but that
 *     aren't the user's (compiler temporaries). They're computed only when a
 *     node reads them.
 *   - `body`: the body of an async JavaScript function that takes the inputs
 *     (and `echo`) as parameters and returns an object with the outputs and
 *     hidden outputs.
 *   - `error`: an error to show at the node instead of running it.
 *   Throws on a syntax error, like `cells`. Recho doesn't analyse the body:
 *   no `let` support, and `isHiddenOutput` isn't used.
 * - `errorOffset(code, error)`: where in `code` to show an error `cells` or
 *   `nodes` threw.
 * - `isHiddenOutput(name)` (for `cells`): whether a name a cell declares stays
 *   private to it instead of becoming a variable other cells can use.
 * - `builtins(stdlib)` (optional): extra names every cell can use, as
 *   `{name: value}`, on top of `recho` (`stdlib`).
 * - `outputLines(code)` (optional): the output lines in `code`, as a Map from
 *   line number to "output" or "error", for a language where code can look
 *   like output (by default, any line starting with an output or error prefix
 *   is output).
 */

import {javascript} from "./javascript.js";

/**
 * The language for a notebook's `runtime` ("javascript@0.1.0",
 * "wenyan@0.1.0", "mlscript@0.1.0"). Other languages are loaded on demand, so JavaScript
 * notebooks don't download their compilers. Rejects a language this version
 * of Recho doesn't know, rather than running the code as something else.
 */
export async function loadLanguage(runtime = "javascript") {
  const id = runtime.split("@")[0];
  if (id === "javascript") return javascript;
  if (id === "wenyan") return (await import("./wenyan.js")).wenyan;
  if (id === "mlscript") return (await import("./mlscript.js")).loadMLscript();
  throw new Error(`Unknown language "${runtime}". It may need a newer version of Recho.`);
}
