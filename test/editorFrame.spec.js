import {afterEach, expect, it} from "vitest";
import {Transaction} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {createEditor} from "../editor/index.js";

const ORIGIN = "https://runtime.example";

let editor;
let container;

afterEach(() => {
  editor?.destroy();
  container?.remove();
  editor = container = null;
});

/** An editor running its code in a fake runtime frame, and the messages sent to it. */
function start(code) {
  container = document.createElement("div");
  document.body.append(container);
  editor = createEditor(container, {code, runtimeOrigin: ORIGIN});
  const iframe = document.querySelector("iframe");
  const sent = [];
  iframe.contentWindow.postMessage = (message) => sent.push(message);
  const data = {recho: true, type: "online"};
  window.dispatchEvent(new MessageEvent("message", {data, origin: ORIGIN, source: iframe.contentWindow}));
  editor.run();
  const view = EditorView.findFromDOM(container.querySelector(".cm-editor"));
  return {view, sent};
}

it("sends the frame an input's edit to the code", () => {
  const {view, sent} = start("const on = recho.toggle(false);\n");
  // As the toggle does when clicked.
  const from = view.state.doc.toString().indexOf("false");
  view.dispatch({
    changes: {from, to: from + 5, insert: "true"},
    annotations: [Transaction.remote.of("control.toggle")],
  });
  expect(sent.filter((m) => m.type === "setCode").at(-1)).toMatchObject({
    code: "const on = recho.toggle(true);\n",
  });
});
