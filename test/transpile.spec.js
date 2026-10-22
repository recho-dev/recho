import {it, expect, describe} from "vitest";
import {rewriteMutables, transpileRechoJavaScript} from "../runtime/transpile.js";

describe("transpile", () => {
  it("should transpile block statements", () => {
    const input = `{setInterval(() => echo(1), 0);}`;
    const output = transpileRechoJavaScript(input);
    expect(output).toBe(
      `let __cellEcho__ = __getEcho__();invalidation.then(__cellEcho__.__dispose__);{setInterval(() =>{const echo = __getEcho__() || __cellEcho__;return ( echo(1));}, 0);}`,
    );
  });

  // Runs a transpiled cell, then returns the value of `expression` in it.
  const run = (cell, expression) => {
    const code = `${transpileRechoJavaScript(cell)}\nreturn ${expression};`;
    return new Function("__getEcho__", "invalidation", code)(() => null, new Promise(() => {}));
  };

  it.each([
    ["a body on the next line", "const g = (x) =>\n  'G' + x;", "g(1)", "G1"],
    ["a comment before the body", "const g = (x) => // note\n  x * 2;", "g(2)", 4],
    ["an object body", "const g = () => ({a: 1});", "g().a", 1],
    ["a sequence body", "const g = () => (0, 2);", "g()", 2],
    ["an arrow in a default parameter", "const g = (f = () => 3) => f() + 1;", "g()", 4],
    ["nested arrows", "const g = (a) =>\n  (b) =>\n    a + b;", "g(1)(2)", 3],
    ["an async arrow", "const g = async () =>\n  5;", "g()", 5],
  ])("keeps the value of an arrow with %s", async (_, cell, expression, expected) => {
    expect(await run(cell, expression)).toEqual(expected);
  });
});

describe("rewriteMutables", () => {
  const cases = [
    ["assignment", "a = 1;", "mutator$a.value = 1;"],
    ["compound assignment", "a += b;", "mutator$a.value += b;"],
    ["update expression", "a++;", "mutator$a.value++;"],
    ["reads in a writer", "a = a * 2;", "mutator$a.value = mutator$a.value * 2;"],
    ["nested closure", "setTimeout(() => { a += 1; }, 0);", "setTimeout(() => { mutator$a.value += 1; }, 0);"],
    ["destructuring", "[a, b] = [b, a];", "[mutator$a.value, b] = [b, mutator$a.value];"],
    ["for...of", "for (a of xs) {}", "for (mutator$a.value of xs) {}"],
    ["shorthand property", "a++, echo({a});", "mutator$a.value++, echo({a: mutator$a.value});"],
    ["shorthand pattern", "({a} = o);", "({a: mutator$a.value} = o);"],
    ["shorthand pattern with default", "({a = 1} = o);", "({a: mutator$a.value = 1} = o);"],
    ["shadowed variable", "function f(a) { a = 1; }", "function f(a) { a = 1; }"],
    ["shadowed by a block", "{ let a = 0; a++; }", "{ let a = 0; a++; }"],
    ["property names", "a = o.a;", "mutator$a.value = o.a;"],
  ];
  for (const [name, input, expected] of cases) {
    it(`should rewrite ${name}`, () => {
      expect(rewriteMutables(input, {a: "mutator$a"})).toBe(expected);
    });
  }

  it("should leave cells without promoted names untouched", () => {
    expect(rewriteMutables("a = 1;", {})).toBe("a = 1;");
  });
});
