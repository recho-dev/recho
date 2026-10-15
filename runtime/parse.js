import {Parser} from "acorn";

// The one set of parser options for Recho code, so the runtime, the
// transpiler and the `let` analysis agree on what parses.
export function parseModule(input) {
  return Parser.parse(input, {ecmaVersion: "latest", sourceType: "module"});
}
