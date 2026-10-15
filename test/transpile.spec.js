import {it, expect, describe} from "vitest";
import {rewriteMutables, transpileRechoJavaScript} from "../runtime/transpile.js";

describe("transpile", () => {
  it("should transpile block statements", () => {
    const input = `{setInterval(() => echo(1), 0);}`;
    const output = transpileRechoJavaScript(input);
    expect(output).toBe(
      `let __cellEcho__ = __getEcho__();invalidation.then(__cellEcho__.__dispose__);{setInterval(() =>{const echo = __getEcho__() || __cellEcho__;return  echo(1);}, 0);}`,
    );
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
      expect(rewriteMutables(input, ["a"])).toBe(expected);
    });
  }

  it("should leave cells without promoted names untouched", () => {
    expect(rewriteMutables("a = 1;", [])).toBe("a = 1;");
  });
});
