import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {blocksOf, changesOnlyOutput, createRuntimeFrame} from "../editor/remoteRuntime.js";
import {blockMetadataEffect} from "../editor/blocks/effect.ts";
import {javascript} from "../runtime/languages/javascript.js";

const PREFIXES = ["//➜", "//✗"];
const ORIGIN = "https://runtime.example";

describe("changesOnlyOutput", () => {
  const code = "//➜ 1\necho(1);\nconst a = 2;\n";

  it("accepts writing, replacing and removing output lines", () => {
    expect(changesOnlyOutput(code, [{from: 4, to: 5, insert: "2"}], PREFIXES)).toBe(true);
    expect(changesOnlyOutput(code, [{from: 0, to: 6}], PREFIXES)).toBe(true);
    expect(changesOnlyOutput(code, [{from: 15, insert: "//✗ Error\n"}], PREFIXES)).toBe(true);
    expect(changesOnlyOutput(code, [], PREFIXES)).toBe(true);
  });

  it("rejects changes to the code", () => {
    expect(changesOnlyOutput(code, [{from: 6, to: 10, insert: "evil"}], PREFIXES)).toBe(false);
    // Turning a code line into output removes it from the code.
    expect(changesOnlyOutput(code, [{from: 15, insert: "//➜ "}], PREFIXES)).toBe(false);
    // Turning output into code adds code.
    expect(changesOnlyOutput(code, [{from: 0, to: 3, insert: "fetch()"}], PREFIXES)).toBe(false);
    expect(changesOnlyOutput(code, [{from: 15, insert: "//➜ x\nsteal();\n"}], PREFIXES)).toBe(false);
  });

  it("rejects changes that aren't valid for the code", () => {
    expect(changesOnlyOutput(code, [{from: 0, to: 999}], PREFIXES)).toBe(false);
    expect(changesOnlyOutput(code, [{from: -1}], PREFIXES)).toBe(false);
    expect(changesOnlyOutput(code, [{from: 1.5}], PREFIXES)).toBe(false);
    expect(changesOnlyOutput(code, [{from: 0, insert: 42}], PREFIXES)).toBe(false);
    expect(changesOnlyOutput(code, "nope", PREFIXES)).toBe(false);
    expect(changesOnlyOutput(code, [null], PREFIXES)).toBe(false);
  });
});

describe("blocksOf", () => {
  const block = {id: "a", name: "cell", output: null, source: {from: 0, to: 5}, attributes: {}, error: false};

  it("keeps only the attributes the editor uses, in safe forms", () => {
    const [b] = blocksOf([{...block, attributes: {compact: true, typeface: "Fira Code", other: 1}}]);
    expect(b.attributes).toEqual({compact: true, typeface: "Fira Code"});
    const [c] = blocksOf([{...block, attributes: {typeface: 'x"; position: fixed; inset: 0'}}]);
    expect(c.attributes).toEqual({});
  });

  it("rejects blocks without valid ranges", () => {
    expect(blocksOf([{...block, source: {from: 5, to: 1}}])).toBe(null);
    expect(blocksOf([{...block, output: {from: "0", to: 1}}])).toBe(null);
    expect(blocksOf("nope")).toBe(null);
  });
});

describe("createRuntimeFrame", () => {
  let frame;
  let sent;

  const iframe = () => document.querySelector("iframe");

  function fromFrame(data, {origin = ORIGIN, source = iframe().contentWindow} = {}) {
    window.dispatchEvent(new MessageEvent("message", {data: {recho: true, ...data}, origin, source}));
  }

  function start(code = "echo(1);\n") {
    frame = createRuntimeFrame(ORIGIN);
    sent = [];
    iframe().contentWindow.postMessage = (message) => sent.push(message);
    fromFrame({type: "online"});
    const runtime = frame.createRuntime(code, {language: javascript});
    const init = sent.find((m) => m.type === "init");
    return {runtime, init};
  }

  beforeEach(() => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"]});
  });

  afterEach(() => {
    frame?.destroy();
    frame = null;
    vi.useRealTimers();
  });

  it("loads the runtime page in a sandboxed iframe", () => {
    start();
    expect(iframe().src).toBe(`${ORIGIN}/`);
    expect(iframe().getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
  });

  it("sends the code and language to start a runtime", () => {
    const {init} = start("echo(2);\n");
    expect(init).toMatchObject({type: "init", code: "echo(2);\n", version: 0, language: "javascript"});
  });

  it("writes the frame's output with its blocks", () => {
    const {runtime, init} = start();
    const onChanges = vi.fn();
    runtime.onChanges(onChanges);
    const blocks = [{id: "a", name: "c", output: {from: 0, to: 0}, source: {from: 0, to: 8}, attributes: {}}];
    fromFrame({type: "changes", runtime: init.seq, version: 0, changes: [{from: 0, insert: "//➜ 1\n"}], blocks});
    expect(onChanges).toHaveBeenCalledTimes(1);
    const [{changes, effects}] = onChanges.mock.calls[0];
    expect(changes).toEqual([{from: 0, insert: "//➜ 1\n"}]);
    expect(effects[0].is(blockMetadataEffect)).toBe(true);
    expect(effects[0].value[0].source).toEqual({from: 0, to: 8});
  });

  it("ignores messages from other windows, origins and runtimes", () => {
    const {runtime, init} = start();
    const onChanges = vi.fn();
    runtime.onChanges(onChanges);
    const message = {
      type: "changes",
      runtime: init.seq,
      version: 0,
      changes: [{from: 0, insert: "//➜ 1\n"}],
      blocks: null,
    };
    fromFrame(message, {origin: "https://evil.example"});
    fromFrame(message, {source: window});
    fromFrame({...message, runtime: init.seq - 1});
    expect(onChanges).not.toHaveBeenCalled();
  });

  it("drops output for code the user has edited since", () => {
    const {runtime, init} = start();
    const onChanges = vi.fn();
    runtime.onChanges(onChanges);
    runtime.setCode("echo(10);\n");
    expect(sent.at(-1)).toMatchObject({type: "setCode", code: "echo(10);\n", version: 1});
    fromFrame({type: "changes", runtime: init.seq, version: 0, changes: [{from: 0, insert: "//➜ 1\n"}], blocks: null});
    expect(onChanges).not.toHaveBeenCalled();
    fromFrame({type: "changes", runtime: init.seq, version: 1, changes: [{from: 0, insert: "//➜ 10\n"}], blocks: null});
    expect(onChanges).toHaveBeenCalledTimes(1);
  });

  it("doesn't send the frame's own changes back to it", () => {
    const {runtime} = start();
    const before = sent.length;
    runtime.setCode("//➜ 1\necho(1);\n", {remote: true});
    expect(sent.length).toBe(before);
  });

  it("stops on changes that aren't output", () => {
    const {runtime, init} = start();
    const onChanges = vi.fn();
    const onError = vi.fn();
    runtime.onChanges(onChanges);
    runtime.onError(onError);
    fromFrame({
      type: "changes",
      runtime: init.seq,
      version: 0,
      changes: [{from: 0, insert: "steal();\n"}],
      blocks: null,
    });
    expect(onChanges).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({source: "frame"}));
  });

  it("reports a frame that stops responding, and that responds again", () => {
    const {runtime} = start();
    const onStatus = vi.fn();
    runtime.onStatus(onStatus);
    vi.advanceTimersByTime(1000);
    fromFrame({type: "heartbeat"});
    vi.advanceTimersByTime(4500);
    expect(runtime.isHung()).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(runtime.isHung()).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith({hung: true});
    fromFrame({type: "heartbeat"});
    expect(runtime.isHung()).toBe(false);
    expect(onStatus).toHaveBeenLastCalledWith({hung: false});
  });

  it("doesn't count time this page's own timers were late", () => {
    const {runtime} = start();
    // E.g. the tab was in the background: the next check runs 10 seconds late.
    const now = performance.now.bind(performance);
    const late = vi.spyOn(performance, "now").mockImplementation(() => now() + 10000);
    vi.advanceTimersByTime(500);
    late.mockRestore();
    expect(runtime.isHung()).toBe(false);
  });

  it("keeps a stuck frame, which a new frame couldn't replace before a reload", () => {
    const {runtime} = start();
    const stuck = iframe();
    vi.advanceTimersByTime(6000);
    expect(runtime.isHung()).toBe(true);
    runtime.destroy();
    expect(stuck.isConnected).toBe(true);
    const next = frame.createRuntime("echo(3);\n", {language: javascript});
    expect(iframe()).toBe(stuck);
    expect(next.isHung()).toBe(true);
  });

  it("keeps a responding frame for the next runtime", () => {
    const {runtime} = start();
    const first = iframe();
    runtime.destroy();
    expect(sent.at(-1)).toMatchObject({type: "destroy"});
    frame.createRuntime("echo(3);\n", {language: javascript});
    expect(iframe()).toBe(first);
    expect(sent.at(-1)).toMatchObject({type: "init", code: "echo(3);\n"});
  });

  it("removes the frame with the editor", () => {
    start();
    frame.destroy();
    frame = null;
    expect(document.querySelector("iframe")).toBe(null);
  });
});
