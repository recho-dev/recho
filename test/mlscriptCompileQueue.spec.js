import {describe, it, expect} from "vitest";
import {latestOnly, OutdatedCompile} from "../runtime/languages/mlscript.js";
import {createCompiler} from "../runtime/languages/mlscript.compile.js";

/** A compiler whose compiles finish when the test says so. */
function manualCompiler() {
  const compiles = [];
  return {
    compiles,
    update(source) {
      return new Promise((resolve, reject) => compiles.push({source, resolve, reject}));
    },
    // Lets the queue react to a finished compile.
    settle: () => new Promise((resolve) => setTimeout(resolve, 0)),
  };
}

describe("latestOnly", () => {
  it("compiles at once when idle", async () => {
    const compiler = manualCompiler();
    const queue = latestOnly(compiler);
    const a = queue.update("a");
    expect(compiler.compiles.map((c) => c.source)).toEqual(["a"]);
    compiler.compiles[0].resolve("A");
    await expect(a).resolves.toBe("A");
  });

  it("skips the requests that a newer one replaced while compiling", async () => {
    const compiler = manualCompiler();
    const queue = latestOnly(compiler);
    const a = queue.update("a");
    const b = queue.update("b");
    const c = queue.update("c");
    const d = queue.update("d");
    // Only one compile at a time.
    expect(compiler.compiles.map((c) => c.source)).toEqual(["a"]);
    await expect(b).rejects.toBeInstanceOf(OutdatedCompile);
    await expect(c).rejects.toBeInstanceOf(OutdatedCompile);

    compiler.compiles[0].resolve("A");
    await expect(a).resolves.toBe("A");
    await compiler.settle();
    // "b" and "c" were never compiled.
    expect(compiler.compiles.map((c) => c.source)).toEqual(["a", "d"]);
    compiler.compiles[1].resolve("D");
    await expect(d).resolves.toBe("D");
  });

  it("goes on with the waiting request after a compile fails", async () => {
    const compiler = manualCompiler();
    const queue = latestOnly(compiler);
    const a = queue.update("a");
    const b = queue.update("b");
    compiler.compiles[0].reject(new SyntaxError("bad"));
    await expect(a).rejects.toThrow("bad");
    await compiler.settle();
    expect(compiler.compiles.map((c) => c.source)).toEqual(["a", "b"]);
    compiler.compiles[1].resolve("B");
    await expect(b).resolves.toBe("B");
  });

  it("compiles again once idle", async () => {
    const compiler = manualCompiler();
    const queue = latestOnly(compiler);
    const a = queue.update("a");
    compiler.compiles[0].resolve("A");
    await a;
    await compiler.settle();
    const b = queue.update("b");
    expect(compiler.compiles.map((c) => c.source)).toEqual(["a", "b"]);
    compiler.compiles[1].resolve("B");
    await expect(b).resolves.toBe("B");
  });

  it("keeps the compiler's other methods", () => {
    const terminated = [];
    const queue = latestOnly({update: async () => null, terminate: () => terminated.push(true)});
    queue.terminate();
    expect(terminated).toEqual([true]);
  });

  it("with the real compiler, compiles only the first and the latest of quick edits", async () => {
    const real = createCompiler();
    const sources = [];
    const queue = latestOnly({
      update: async (source) => {
        sources.push(source);
        return real.update(source);
      },
    });
    const versions = ["val x = 1", "val x = 2", "val x = 3", "val x = 4\n\nval y = x + 1"];
    const results = versions.map((source) => queue.update(source));
    const settled = await Promise.allSettled(results);
    expect(sources).toEqual([versions[0], versions[3]]);
    expect(settled.map((r) => r.status)).toEqual(["fulfilled", "rejected", "rejected", "fulfilled"]);
    expect(settled[3].value.nodes.map((node) => node.outputs)).toEqual([["x"], ["y"]]);
    // Starting the compiler can take more than the default 5 s when the other test files run alongside.
  }, 30000);
});
