// How each way an MLscript notebook can fail shows in the document.
import {it, expect, describe, afterEach, beforeAll, vi, beforeEach} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {
  COMPILE_TIMEOUT,
  CompilerFailure,
  createMLscript,
  latestOnly,
  workerCompiler,
} from "../runtime/languages/mlscript.js";
import {createCompiler} from "../runtime/languages/mlscript.compile.js";
import {makeOutput} from "../runtime/output.js";

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

let mlscript;

beforeAll(async () => {
  mlscript = await loadLanguage("mlscript@0.1.0");
}, 30000);

function start(code, language = mlscript) {
  let state = EditorState.create({doc: code});
  const runtime = createRuntime(code, {language});
  const errors = [];
  const statuses = [];
  runtime.onError(({error}) => errors.push(error));
  runtime.onStatus(({compiling}) => statuses.push(compiling));
  runtime.onChanges((specs) => {
    state = state.update(specs).state;
    runtime.setCode(state.doc.toString());
  });
  runtime.run();
  return {runtime, errors, statuses, doc: () => state.doc.toString()};
}

/** A compiler that is the real one, except for the sources `fake(source, real)` gives a result (or a promise) for. */
function compilerWith(fake) {
  const real = createCompiler();
  return {update: async (source) => (await fake(source, real)) ?? real.update(source)};
}

/** What the compiler returns when its session couldn't be set up (e.g. the standard library didn't load). */
const sessionFailure = {
  nodes: [],
  requiredImports: [],
  diagnostics: [
    {
      kind: "error",
      source: "compilation",
      message: "Couldn't load the standard library",
      locations: [{message: "Couldn't load the standard library", range: null}],
    },
  ],
};

/** A value that can't be shown: its traps throw (but it isn't mistaken for a promise or generator). */
const unshowable = () =>
  new Proxy(
    {},
    {
      get(target, key) {
        if (key === "then" || key === "next" || typeof key === "symbol") return undefined;
        throw new Error("trap");
      },
      ownKeys() {
        throw new Error("keys");
      },
    },
  );

// Tests here break notebooks on purpose, and the runtime logs every error it
// shows. Keep those logs out of the test output.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("MLscript errors", () => {
  let notebook;
  const run = (code, language) => (notebook = start(code, language));
  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    delete globalThis.__unshowable__;
    await wait(0);
    vi.restoreAllMocks();
  });

  describe("compile errors", () => {
    it("shows a compile error with its line and column in the document", async () => {
      run(`let a = 1\n\nfun f(x) = x\n\nf(1, 2, 3)\n\necho(a)\n`);
      await wait();
      expect(notebook.doc()).toBe(
        `let a = 1\n\nfun f(x) = x\n\n` +
          `//✗ [CompileError: \`f\` expects 1 argument but got 3. (6:0)]\nf(1, 2, 3)\n\n` +
          `//➜ 1\necho(a)\n`,
      );
    });

    it("lists the locations of a message that has none itself", async () => {
      run(`fun f = 1\nfun f = 2\n\necho(3)\n`);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [CompileError: \`f\` is defined more than once in this block. (5:0)\n//✗ Defined here. (4:0)\n//✗ Defined here. (5:0)]\nfun f = 1\nfun f = 2\n\n//➜ 3\necho(3)\n`,
      );
    });

    it("gives the line of an error inside a multi-line block", async () => {
      run(`fun g(x) =\n  let y = x\n  nope + y\n`);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [CompileError: Unknown name \`nope\`. (4:2)]\nfun g(x) =\n  let y = x\n  nope + y\n`,
      );
    });

    it("keeps the line numbers right as output above moves the block, and is idempotent", async () => {
      const code = `echo("a\\nb")\n\nlet bad = nope\n`;
      const expected = `//➜ a\n//➜ b\necho("a\\nb")\n\n//✗ [CompileError: Unknown name \`nope\`. (6:10)]\nlet bad = nope\n`;
      run(code);
      await wait();
      expect(notebook.doc()).toBe(expected);
      notebook.runtime.destroy();
      run(expected);
      await wait();
      expect(notebook.doc()).toBe(expected);
    });

    it("names parse errors ParseError", async () => {
      run(`let a = (1 +\n\necho(2)\n`);
      await wait();
      expect(notebook.doc()).toMatch(/^\/\/✗ \[ParseError: This `\(` is never closed\. \(2:8\)\]\n/);
      expect(notebook.doc()).toContain(`//➜ 2\necho(2)`);
    });

    it("says honestly when the compiler hit an internal error, and logs its detail", async () => {
      const internal = (detail) => ({
        kind: "internal",
        source: "compilation",
        message: "Internal",
        locations: [],
        detail,
      });
      const compiler = compilerWith((source, real) => {
        if (!source.includes("boom")) return;
        const result = real.update(source);
        result.nodes[0].diagnostics = [internal("scala.MatchError: X (of class Y)")];
        return result;
      });
      const language = await createMLscript(latestOnly(compiler));
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      run(`let boom = 1\n\necho(2)\n`, language);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [CompileError: The MLscript compiler hit an internal error on this block.]\nlet boom = 1\n\n//➜ 2\necho(2)\n`,
      );
      expect(logged.mock.calls.flat().join("\n")).toContain("scala.MatchError: X (of class Y)");
    });

    it("shows an ordinary error that has a detail as itself", async () => {
      const compiler = compilerWith((source, real) => {
        if (!source.includes("deep")) return;
        const result = real.update(source);
        const message = "Stack overflow while compiling this block";
        const range = {start: 0, end: 3};
        result.nodes[0].diagnostics = [
          {kind: "error", source: "compilation", message, locations: [{message, range}], detail: "raw text"},
        ];
        return result;
      });
      const language = await createMLscript(latestOnly(compiler));
      run(`let deep = 1\n`, language);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [CompileError: Stack overflow while compiling this block (2:0)]\nlet deep = 1\n`,
      );
    });
  });

  describe("warnings", () => {
    const code = `fun g(x) =\n  x\n  1\n\necho(g(2))\n`;
    const shown = `//➜ Warning: This value is computed and then discarded. (3:2)\nfun g(x) =\n  x\n  1\n\n//➜ 1\necho(g(2))\n`;

    it("shows a warning above its block, as output, and still runs it", async () => {
      run(code);
      await wait();
      expect(notebook.doc()).toBe(shown);
    });

    it("doesn't repeat a warning when run again", async () => {
      run(shown);
      await wait();
      expect(notebook.doc()).toBe(shown);
    });
  });

  describe("whole-document errors and compiler failures", () => {
    it("shows a failure to set up the session at the top, keeping the output, and doesn't repeat it", async () => {
      const compiler = compilerWith((source) => (source ? sessionFailure : null));
      const language = await createMLscript(latestOnly(compiler));
      const shown = `//✗ [Error: The MLscript compiler couldn't start: Couldn't load the standard library]\n//➜ 1\necho(1)\n`;
      run(`//➜ 1\necho(1)\n`, language);
      await wait();
      expect(notebook.doc()).toBe(shown);
      expect(notebook.errors).toHaveLength(1);
      expect(notebook.errors[0]).toBeInstanceOf(CompilerFailure);
      notebook.runtime.destroy();
      run(shown, language);
      await wait();
      expect(notebook.doc()).toBe(shown);
    });

    it("says the compiler crashed, as a plain error, keeping the output", async () => {
      let crashes = 1;
      const compiler = compilerWith((source) => {
        if (source && crashes-- > 0) throw new TypeError("scala.MatchError: boom (of class X)");
      });
      const language = await createMLscript(latestOnly(compiler));
      run(`//➜ 2\necho(a + 1)\n\nlet a = 1\n`, language);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [Error: The MLscript compiler crashed: scala.MatchError: boom (of class X)]\n//➜ 2\necho(a + 1)\n\nlet a = 1\n`,
      );
      expect(notebook.errors[0]).toBeInstanceOf(CompilerFailure);
      // The editor stops the runtime on such an error; the next run works.
      notebook.runtime.destroy();
      run(notebook.doc(), language);
      await wait();
      expect(notebook.doc()).toBe(`//✗ [CompileError: Unknown name \`a\`. (2:5)]\necho(a + 1)\n\nlet a = 1\n`);
    });
  });

  describe("a stuck compiler", () => {
    afterEach(() => vi.useRealTimers());

    it("gives up on a compile that never settles, restarts the compiler and compiles what waited", async () => {
      vi.useFakeTimers();
      const compiles = [];
      const compiler = {
        update: (source) => new Promise((resolve) => compiles.push({source, resolve})),
        restart: vi.fn(),
      };
      const queue = latestOnly(compiler, {timeout: COMPILE_TIMEOUT});
      const stuck = queue.update("a");
      const next = queue.update("b");
      const failed = expect(stuck).rejects.toThrow("The MLscript compiler stopped responding; it has been restarted.");
      await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT);
      await failed;
      await expect(stuck).rejects.toBeInstanceOf(CompilerFailure);
      expect(compiler.restart).toHaveBeenCalledTimes(1);
      expect(compiles.map((c) => c.source)).toEqual(["a", "b"]);
      compiles[1].resolve("B");
      await expect(next).resolves.toBe("B");
    });

    it("doesn't time out a compile that settles in time", async () => {
      vi.useFakeTimers();
      const compiler = {update: async (source) => source.toUpperCase(), restart: vi.fn()};
      const queue = latestOnly(compiler, {timeout: COMPILE_TIMEOUT});
      await expect(queue.update("a")).resolves.toBe("A");
      await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT * 2);
      expect(compiler.restart).not.toHaveBeenCalled();
    });

    it("tells the editor when a compile takes long", async () => {
      const real = createCompiler();
      let slow = false;
      const compiler = {
        update: (source) => new Promise((resolve) => setTimeout(() => resolve(real.update(source)), slow ? 1300 : 0)),
      };
      const language = await createMLscript(latestOnly(compiler));
      slow = true;
      run(`echo(1)\n`, language);
      await wait(1100);
      expect(notebook.statuses).toEqual([true]);
      await wait(500);
      expect(notebook.statuses).toEqual([true, false]);
      expect(notebook.doc()).toBe(`//➜ 1\necho(1)\n`);
    });
  });

  describe("the compiler's worker", () => {
    class FakeWorker {
      static instances = [];
      static respond = () => {};
      constructor() {
        this.terminated = false;
        FakeWorker.instances.push(this);
      }
      postMessage(data) {
        FakeWorker.respond(this, data);
      }
      terminate() {
        this.terminated = true;
      }
    }

    afterEach(() => {
      vi.unstubAllGlobals();
      FakeWorker.instances = [];
      FakeWorker.respond = () => {};
    });

    it("rejects the pending compiles when the worker fails", async () => {
      vi.stubGlobal("Worker", FakeWorker);
      const compiler = workerCompiler();
      const compile = compiler.update("a");
      FakeWorker.instances[0].onerror({message: "out of memory", preventDefault() {}});
      await expect(compile).rejects.toThrow("The MLscript compiler failed: out of memory.");
    });

    it("rebuilds an error the worker posts without showing its fields", async () => {
      vi.stubGlobal("Worker", FakeWorker);
      FakeWorker.respond = (worker, {id}) =>
        queueMicrotask(() => worker.onmessage({data: {id, error: {name: "TypeError", message: "bad", pos: 3}}}));
      const error = await workerCompiler()
        .update("a")
        .catch((error) => error);
      expect(error).toBeInstanceOf(TypeError);
      expect(Object.keys(error)).toEqual([]);
      expect(makeOutput([{values: [error]}]).output).toBe("//✗ [TypeError: bad]");
    });

    it("replaces a worker that stopped responding", async () => {
      vi.stubGlobal("Worker", FakeWorker);
      const compiler = workerCompiler();
      const compile = compiler.update("a");
      compiler.restart();
      await expect(compile).rejects.toThrow("stopped responding");
      expect(FakeWorker.instances).toHaveLength(2);
      expect(FakeWorker.instances[0].terminated).toBe(true);
      FakeWorker.respond = (worker, {id}) => queueMicrotask(() => worker.onmessage({data: {id, result: "B"}}));
      await expect(compiler.update("b")).resolves.toBe("B");
    });
  });

  describe("imports", () => {
    it("shows an unknown standard library module at its import, and at its uses", async () => {
      run(`import "std/Nope.mls"\n\nlet a = 1\n\necho(a)\n\nlet x = Nope.f\n`);
      await wait(600);
      expect(notebook.doc()).toBe(
        `//✗ [CompileError: There is no standard library module \`Nope\`. (2:7)]\nimport "std/Nope.mls"\n\n` +
          `let a = 1\n\n//➜ 1\necho(a)\n\n` +
          `//✗ [CompileError: \`Nope\` has no member \`f\`. (10:8)]\nlet x = Nope.f\n`,
      );
    });

    it("loads an import that works without showing anything", async () => {
      run(`import "std/Option.mls"\n\necho(1)\n`);
      await wait(600);
      expect(notebook.doc()).toBe(`import "std/Option.mls"\n\n//➜ 1\necho(1)\n`);
    });
  });

  describe("runtime and display errors", () => {
    it("shows a value that can't be shown as an error, and the rest of the notebook", async () => {
      globalThis.__unshowable__ = unshowable();
      run(`echo(globalThis.__unshowable__)\n\necho(1 + 1)\n`);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [Error: Couldn't show this value: trap]\necho(globalThis.__unshowable__)\n\n//➜ 2\necho(1 + 1)\n`,
      );
    });

    it("shows a value that can't be shown in JavaScript as an error too", () => {
      expect(makeOutput([{values: [unshowable()]}])).toEqual({
        output: "//✗ [Error: Couldn't show this value: trap]",
        error: true,
      });
    });

    it("shows a runtime error at its block, like JavaScript", async () => {
      run(`fun f() = throw Error("boom")\n\nlet y = f()\n\necho(2)\n`);
      await wait();
      expect(notebook.doc()).toBe(
        `fun f() = throw Error("boom")\n\n//✗ [Error: boom]\nlet y = f()\n\n//➜ 2\necho(2)\n`,
      );
    });

    it("shows a multi-line error message without padding", async () => {
      run(`throw Error("one\\nlonger line two\\nthree")\n`);
      await wait();
      expect(notebook.doc()).toBe(
        `//✗ [Error: one\n//✗ longer line two\n//✗ three]\nthrow Error("one\\nlonger line two\\nthree")\n`,
      );
    });

    it("wraps a long error message instead of cutting it short", async () => {
      const message = "word ".repeat(50).trim();
      run(`throw Error("${message}")\n`);
      await wait();
      const lines = notebook
        .doc()
        .split("\n")
        .filter((line) => line.startsWith("//✗"));
      expect(lines.length).toBeGreaterThan(2);
      expect(lines.every((line) => line.length <= 104)).toBe(true);
      expect(lines.join(" ").replaceAll("//✗ ", "")).toBe(`[Error: ${message}]`);
    });
  });
});
