/**
 * Compiles MLscript off the main thread: the compiler is large and slow to
 * start, and a compile can take most of a second.
 *
 * Messages in: `{id, source}`, the code to compile (without output lines).
 * Messages out: `{id, result}` (see createCompiler in ./mlscript.compile.js)
 * or `{id, error: {name, message, pos}}`, in the order the sources came in.
 */

import {createCompiler} from "./mlscript.compile.js";

const compiler = createCompiler();

self.onmessage = ({data: {id, source}}) => {
  try {
    self.postMessage({id, result: compiler.update(source)});
  } catch (error) {
    const {name = "Error", message = String(error), pos} = error ?? {};
    self.postMessage({id, error: {name, message, pos}});
  }
};
