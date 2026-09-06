import {it, expect, describe, afterEach} from "vitest";
import {createRuntime} from "../runtime/index.js";

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

describe("echo.dispose on invalidation", () => {
  let runtime;

  afterEach(async () => {
    runtime?.destroy();
    runtime = null;
    await wait(0);
    delete globalThis.__rechoEchoDispose;
    delete globalThis.__rechoUnrelated;
  });

  it("runs echo.dispose when a caller that never mentions echo is invalidated", async () => {
    globalThis.__rechoEchoDispose = {starts: 0, disposes: 0};
    runtime = createRuntime(`const [n, setN] = recho.state(0);
recho.button("Go", () => setN(n + 1));
go(n);
function go(n) {
  globalThis.__rechoEchoDispose.starts++;
  echo.dispose(() => {
    globalThis.__rechoEchoDispose.disposes++;
  });
}
`);
    runtime.onChanges(() => {});
    runtime.run();
    await wait();
    expect(globalThis.__rechoEchoDispose.starts).toBe(1);
    expect(globalThis.__rechoEchoDispose.disposes).toBe(0);

    runtime.buttonRegistry.executeCallback("Go");
    await wait();
    expect(globalThis.__rechoEchoDispose.disposes).toBe(1);
    expect(globalThis.__rechoEchoDispose.starts).toBe(2);
  });

  it("does not dispose unrelated cells when a button updates state", async () => {
    globalThis.__rechoUnrelated = {disposes: 0};
    runtime = createRuntime(`const [n, setN] = recho.state(0);
recho.button("Go", () => setN(n + 1));
echo(n);
{
  echo.dispose(() => {
    globalThis.__rechoUnrelated.disposes++;
  });
}
`);
    runtime.onChanges(() => {});
    runtime.run();
    await wait();

    runtime.buttonRegistry.executeCallback("Go");
    await wait();
    expect(globalThis.__rechoUnrelated.disposes).toBe(0);
  });

  it("does not dispose unrelated cells when another cell's source changes", async () => {
    globalThis.__rechoUnrelated = {starts: 0, disposes: 0};
    const before = `const x1 = 10;
{
  globalThis.__rechoUnrelated.starts++;
  echo.dispose(() => {
    globalThis.__rechoUnrelated.disposes++;
  });
}
echo(x1);
`;
    const after = `const x1 = 11;
{
  globalThis.__rechoUnrelated.starts++;
  echo.dispose(() => {
    globalThis.__rechoUnrelated.disposes++;
  });
}
echo(x1);
`;
    runtime = createRuntime(before);
    runtime.onChanges(() => {});
    runtime.run();
    await wait();
    expect(globalThis.__rechoUnrelated.starts).toBe(1);
    expect(globalThis.__rechoUnrelated.disposes).toBe(0);

    runtime.setCode(after);
    runtime.run();
    await wait();
    expect(globalThis.__rechoUnrelated.disposes).toBe(0);
    expect(globalThis.__rechoUnrelated.starts).toBe(1);
  });
});

describe("runtime destroy", () => {
  let runtime;

  afterEach(() => {
    runtime?.destroy();
    runtime = null;
  });

  it("does not emit changes from a pending refresh after destroy", async () => {
    let changeCount = 0;
    runtime = createRuntime("echo(1)");
    runtime.onChanges(() => {
      changeCount++;
    });
    runtime.run();
    runtime.destroy();
    await wait();
    expect(changeCount).toBe(0);
  });

  it("does not emit further changes after destroy", async () => {
    let changeCount = 0;
    runtime = createRuntime("echo(1)");
    runtime.onChanges(() => {
      changeCount++;
    });
    runtime.run();
    await wait();
    const before = changeCount;
    expect(before).toBeGreaterThan(0);
    runtime.destroy();
    runtime.setIsRunning(true);
    runtime.run();
    await wait();
    expect(changeCount).toBe(before);
  });
});
