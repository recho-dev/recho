// Runs notebooks in an iframe on another site (the runtime page,
// ../runtime/frame/), with the same API as createRuntime (../runtime/index.js).
//
// - Security: notebook code can't reach this page: its sign-in, its storage,
//   its DOM. What the frame sends is untrusted: its changes may only touch
//   output lines (so a notebook can't rewrite the code the user saves), and
//   only block attributes the editor uses, in safe forms, are kept.
// - Freezing: an infinite loop freezes the frame, not the editor (in browsers
//   that give another site's iframe its own process). The frame sends a
//   heartbeat; when it stops, the runtime reports `{hung: true}`, and
//   `{hung: false}` if it starts again. A stuck frame can't be replaced: the
//   browser often puts a new frame of the same site in the same, stuck
//   process, even after a reload, until the tab is closed. So the frame
//   stays; the editor keeps the code and doesn't run it when the notebook is
//   opened again (../app/Editor.jsx).
//
// Messages. The editor sends `{recho: true, seq, type, ...}`, `seq` counting
// up:
// - `init {code, version, language}`: start a runtime (dropping any other)
// - `setCode {code, version}`: the user edited the code
// - `setIsRunning {value}`, `run`, `runCells {positions}`, `buttonClick {id}`,
//   `destroy`
// The frame sends `{recho: true, type, ...}`:
// - `online`, `heartbeat`
// - `changes {version, changes, blocks}`: output to write, for the code as of
//   the editor's edit `version`, and the blocks (BlockMetadata as data)
// - `running {value, seq}`, `error {error, source}`, `status {status}`
// Each runtime message also has `runtime`, the `seq` of its `init`.

import {ChangeSet, Text} from "@codemirror/state";
import {dispatch as d3Dispatch} from "d3-dispatch";
import {BlockMetadata} from "./blocks/BlockMetadata.ts";
import {blockMetadataEffect} from "./blocks/effect.ts";

// How long without a heartbeat before the frame counts as not responding.
const HUNG_AFTER = 5000;
const WATCH_INTERVAL = 500;
// How long the runtime page may take to load before a run fails.
const LOAD_TIMEOUT = 15000;

/** The lines of `code` that aren't output, as one string. */
function codeLines(code, prefixes) {
  return code
    .split("\n")
    .filter((line) => !prefixes.some((prefix) => line.startsWith(prefix)))
    .join("\n");
}

/**
 * Whether `changes` (change specs, as the runtime dispatches them) are valid
 * for `code` and only write output: lines starting with one of `prefixes`.
 * Exported for tests.
 */
export function changesOnlyOutput(code, changes, prefixes) {
  if (!Array.isArray(changes)) return false;
  for (const change of changes) {
    if (!change || typeof change !== "object") return false;
    const {from, to = from, insert = ""} = change;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > code.length) return false;
    if (typeof insert !== "string") return false;
  }
  if (!changes.length) return true;
  const doc = Text.of(code.split("\n"));
  const next = ChangeSet.of(changes, doc.length).apply(doc).toString();
  return codeLines(next, prefixes) === codeLines(code, prefixes);
}

// The block attributes the editor uses (see ./blocks/output.ts). A typeface
// goes into a style attribute, so it's kept only as a plain name.
function safeAttributes(attributes) {
  const safe = {};
  if (attributes?.compact === true) safe.compact = true;
  if (typeof attributes?.typeface === "string" && /^[\w -]{1,64}$/.test(attributes.typeface)) {
    safe.typeface = attributes.typeface;
  }
  return safe;
}

/**
 * BlockMetadata from the frame's data, for code of `length`, or null if any
 * of it isn't valid. Exported for tests.
 */
export function blocksOf(data, length) {
  if (!Array.isArray(data)) return null;
  const isRange = (range) =>
    !!range &&
    Number.isInteger(range.from) &&
    Number.isInteger(range.to) &&
    0 <= range.from &&
    range.from <= range.to &&
    range.to <= length;
  const blocks = [];
  for (const b of data) {
    if (!b || !isRange(b.source) || (b.output !== null && !isRange(b.output))) return null;
    blocks.push(
      new BlockMetadata(
        String(b.id),
        String(b.name),
        b.output,
        b.source,
        safeAttributes(b.attributes),
        b.error === true,
      ),
    );
  }
  return blocks;
}

function errorOf(data, fallback = "The notebook's runtime failed.") {
  const error = new Error(typeof data?.message === "string" ? data.message : fallback);
  if (typeof data?.name === "string") error.name = data.name;
  return error;
}

/**
 * The runtime frame of an editor, loaded from `origin` (the runtime page's
 * site) right away so that the first run doesn't wait for it.
 * `createRuntime(code, {language})` returns a runtime (one at a time) with
 * the API of ../runtime/index.js, plus `isHung()`.
 */
export function createRuntimeFrame(origin, {container = document.body} = {}) {
  origin = new URL(origin).origin;
  let iframe = null;
  let online = false;
  let queued = [];
  let seq = 0;
  let lastBeat = 0;
  let lastWatch = performance.now();
  let hung = false;
  // The runtime using the frame, if any.
  let current = null;

  function open() {
    iframe = document.createElement("iframe");
    // Its own site, so `allow-same-origin` only lets it use its own storage
    // and workers (MLscript compiles in one). No navigating this page.
    // `allow-modals`: notebooks can use alert(), confirm() and prompt().
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-modals");
    // E.g. a notebook using the webcam (ml5-handpose).
    iframe.setAttribute("allow", "camera; microphone");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.title = "Recho runtime";
    // On screen but invisible: browsers pause animation frames in hidden
    // frames from other sites, and the Observable runtime uses them.
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });
    iframe.src = `${origin}/`;
    online = false;
    queued = [];
    container.append(iframe);
  }

  function close() {
    iframe?.remove();
    iframe = null;
    online = false;
    queued = [];
    setHung(false);
  }

  function send(message) {
    const full = {recho: true, seq: ++seq, ...message};
    if (online) iframe.contentWindow.postMessage(full, origin);
    else queued.push(full);
    return full.seq;
  }

  function setHung(value) {
    if (hung === value) return;
    hung = value;
    current?.receiveStatus({hung: value});
  }

  function onMessage(event) {
    if (!iframe || event.source !== iframe.contentWindow || event.origin !== origin) return;
    const message = event.data;
    if (message?.recho !== true) return;
    lastBeat = performance.now();
    setHung(false);
    if (message.type === "online") {
      online = true;
      for (const m of queued) iframe.contentWindow.postMessage(m, origin);
      queued = [];
    } else if (message.type !== "heartbeat") {
      current?.receive(message);
    }
  }

  function watch() {
    const now = performance.now();
    // This check itself ran late: this page was in the background (its timers
    // slowed down, the frame's heartbeat too) or busy, so heartbeats may be
    // waiting to be read. Count from now.
    const late = now - lastWatch > WATCH_INTERVAL * 2;
    lastWatch = now;
    if (!online || late || document.visibilityState !== "visible") {
      lastBeat = now;
      return;
    }
    if (now - lastBeat > HUNG_AFTER) setHung(true);
  }

  window.addEventListener("message", onMessage);
  const watcher = setInterval(watch, WATCH_INTERVAL);
  open();

  function createRuntime(code, {language}) {
    current?.detach();
    if (!iframe) open();
    const dispatcher = d3Dispatch("changes", "error", "status");
    const prefixes = [language.output.outputPrefix, language.output.errorPrefix];
    // The editor's code, and its edit count, which the frame's changes must
    // be for.
    let doc = code;
    let version = 0;
    let isRunning = false;
    let disposed = false;
    const id = send({type: "init", code, version, language: language.id});

    const loadTimer = setTimeout(() => {
      if (online || disposed) return;
      const error = new Error(
        "Couldn't start the notebook. If a notebook stopped responding in this tab, close the tab, wait a few seconds, and open the notebook again.",
      );
      // The editor shows this message as it is.
      error.code = "RECHO_RUNTIME_LOAD";
      fail(error, "load");
    }, LOAD_TIMEOUT);

    function fail(error, source) {
      dispatcher.call("error", null, {error, source});
    }

    function command(message) {
      if (!disposed) send(message);
    }

    const runtime = {
      /** `remote`: the change came from this runtime, which already has it. */
      setCode(newCode, {remote = false} = {}) {
        doc = newCode;
        if (remote) return;
        version++;
        command({type: "setCode", code: newCode, version});
      },
      setIsRunning(value) {
        isRunning = value;
        command({type: "setIsRunning", value});
      },
      run() {
        command({type: "run"});
      },
      runCells(positions) {
        isRunning = true;
        command({type: "runCells", positions});
      },
      onChanges: (callback) => dispatcher.on("changes", callback),
      onError: (callback) => dispatcher.on("error", callback),
      onStatus: (callback) => dispatcher.on("status", callback),
      isRunning: () => isRunning,
      isHung: () => hung,
      destroy() {
        if (disposed) return;
        disposed = true;
        isRunning = false;
        clearTimeout(loadTimer);
        // A stuck frame gets this when (if) it responds again.
        send({type: "destroy"});
        if (current === handle) current = null;
      },
      buttonRegistry: {
        executeCallback: (buttonId) => command({type: "buttonClick", id: buttonId}),
      },
    };

    const handle = {
      detach() {
        if (!disposed) runtime.destroy();
      },
      receiveStatus(status) {
        if (!disposed) dispatcher.call("status", null, status);
      },
      receive(message) {
        if (disposed || message.runtime !== id) return;
        switch (message.type) {
          case "changes": {
            // For code the user has edited since.
            if (message.version !== version) return;
            // Block positions are in the code before the changes.
            const blocks = message.blocks === null ? null : blocksOf(message.blocks, doc.length);
            if (!changesOnlyOutput(doc, message.changes, prefixes) || (message.blocks !== null && !blocks)) {
              fail(new Error("The notebook's runtime sent changes that aren't output."), "frame");
              return;
            }
            dispatcher.call("changes", null, {
              changes: message.changes,
              effects: blocks ? [blockMetadataEffect.of(blocks)] : [],
            });
            break;
          }
          case "running":
            // Not a report from before the latest command.
            if (message.seq === seq && typeof message.value === "boolean") isRunning = message.value;
            break;
          case "error":
            fail(errorOf(message.error), typeof message.source === "string" ? message.source : "frame");
            break;
          case "status":
            if (typeof message.status?.compiling === "boolean") {
              dispatcher.call("status", null, {compiling: message.status.compiling});
            }
            break;
        }
      },
    };
    current = handle;
    if (hung) handle.receiveStatus({hung: true});
    return runtime;
  }

  return {
    createRuntime,
    destroy() {
      current?.detach();
      clearInterval(watcher);
      window.removeEventListener("message", onMessage);
      close();
    },
  };
}
