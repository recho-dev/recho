// The runtime page: runs a notebook's code in an iframe on its own site, so
// a notebook can't reach the editor's page (its sign-in, its storage) and an
// infinite loop freezes only this frame. The editor talks to it through
// ../../editor/remoteRuntime.js, which documents the messages.

import {ChangeSet, Text} from "@codemirror/state";
import {createRuntime} from "../index.js";
import {loadLanguage} from "../languages/index.js";
import {blockMetadataEffect} from "../../editor/blocks/effect.ts";

const HEARTBEAT_INTERVAL = 200;

// The parent's origin, from its first message. Until then, messages carry
// nothing but their type.
let parentOrigin = "*";

function post(message) {
  window.parent.postMessage({recho: true, ...message}, parentOrigin);
}

// The runtime and the code it has, which is the editor's code: the frame
// applies its own changes, as the editor does, and the editor sends its edits.
let runtime = null;
let code = "";
// The editor's edit count the code is based on, sent with changes so that the
// editor can drop changes made for code it has since edited.
let version = 0;
// The runtime's id (its `init` message's `seq`), sent with everything about
// it, so that the editor can tell an earlier runtime's messages.
let runtimeId = null;
// The last command handled, sent with `running` so that the editor can tell
// a report made before its latest command.
let seq = 0;
let reportedRunning = null;
// Whether the user edited the code since it last ran: until it runs again,
// the runtime's changes are for the code before the edit, so they're dropped.
let edited = false;

function reportRunning() {
  const value = runtime?.isRunning() ?? false;
  if (value === reportedRunning) return;
  reportedRunning = value;
  post({type: "running", value, seq, runtime: runtimeId});
}

function applyChanges(code, changes) {
  const doc = Text.of(code.split("\n"));
  return ChangeSet.of(changes, doc.length).apply(doc).toString();
}

// What the editor uses of a block's attributes (see ../../editor/blocks/output.ts),
// as values that can be sent.
function sendableAttributes(attributes = {}) {
  const sendable = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) sendable[key] = value;
  }
  return sendable;
}

function sendableBlocks(effects = []) {
  const effect = effects.find((e) => e.is(blockMetadataEffect));
  if (!effect) return null;
  return effect.value.map((block) => ({
    id: block.id,
    name: block.name,
    output: block.output,
    source: block.source,
    attributes: sendableAttributes(block.attributes),
    error: block.error,
  }));
}

function serializeError(error) {
  return {name: error?.name ?? "Error", message: String(error?.message ?? error)};
}

async function init({seq: id, code: initialCode, version: initialVersion, language: languageId}) {
  runtime?.destroy();
  runtime = null;
  runtimeId = id;
  reportedRunning = null;
  edited = false;
  code = initialCode;
  version = initialVersion;
  const language = await loadLanguage(languageId);
  const current = createRuntime(code, {language});
  runtime = current;
  current.onChanges(({changes, effects}) => {
    if (runtime !== current || edited) return;
    let next;
    try {
      next = applyChanges(code, changes);
    } catch (error) {
      // For other code: e.g. the runtime wrote output for the code before an
      // edit just before it heard of the edit.
      console.warn("Dropped output for other code:", error);
      return;
    }
    code = next;
    current.setCode(code);
    post({type: "changes", version, changes, blocks: sendableBlocks(effects), runtime: id});
    reportRunning();
  });
  current.onError(({error, source}) => post({type: "error", error: serializeError(error), source, runtime: id}));
  current.onStatus((status) => post({type: "status", status, runtime: id}));
}

async function handle(message) {
  switch (message.type) {
    case "init":
      try {
        await init(message);
      } catch (error) {
        console.error(error);
        post({type: "error", error: serializeError(error), source: "init", runtime: runtimeId});
      }
      break;
    case "setCode":
      code = message.code;
      version = message.version;
      edited = true;
      runtime?.setCode(code);
      break;
    case "setIsRunning":
      if (message.value) edited = false;
      runtime?.setIsRunning(message.value);
      break;
    case "run":
      edited = false;
      runtime?.run();
      break;
    case "runCells":
      edited = false;
      runtime?.runCells(message.positions);
      break;
    case "buttonClick":
      runtime?.buttonRegistry.executeCallback(message.id);
      break;
    case "destroy":
      runtime?.destroy();
      runtime = null;
      break;
  }
}

// Commands run in order, each after the one before has finished (`init`
// waits for its language to load).
let queue = Promise.resolve();

window.addEventListener("message", (event) => {
  // Only the page that embeds the runtime sends it commands. Embedding it
  // elsewhere gives nothing a notebook couldn't do here anyway.
  if (event.source !== window.parent || event.data?.recho !== true) return;
  parentOrigin = event.origin;
  const message = event.data;
  queue = queue.then(async () => {
    seq = message.seq ?? seq;
    try {
      await handle(message);
    } catch (error) {
      console.error(error);
      post({type: "error", error: serializeError(error), source: message.type, runtime: runtimeId});
    }
    reportRunning();
  });
});

// A heartbeat, so the editor can tell when this frame stops responding.
setInterval(() => post({type: "heartbeat"}), HEARTBEAT_INTERVAL);
post({type: "online"});
