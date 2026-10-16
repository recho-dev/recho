import {EditorView, basicSetup} from "codemirror";
import {EditorState, Transaction} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {githubLightInit} from "@uiw/codemirror-theme-github";
import {tags as t} from "@lezer/highlight";
import {indentWithTab} from "@codemirror/commands";
import {createRuntime} from "../runtime/index.js";
import {javascript} from "../runtime/languages/javascript.js";
import {dispatch as d3Dispatch} from "d3-dispatch";
import {blockIndicator} from "./blocks";
import {javascriptSupport} from "./languages/javascript.js";

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.code
 * @param {(error: any) => void} [options.onError]
 * @param {import("@codemirror/state").Extension[]} [options.extensions]
 * @param {object} [options.language] - The notebook's language (see
 *   ../runtime/languages/index.js), JavaScript by default.
 * @param {import("@codemirror/state").Extension[]} [options.languageSupport] -
 *   Editor extensions for a language other than JavaScript (see
 *   ./languages/index.js).
 */
export function createEditor(container, options) {
  const {code, onError, extensions = [], language = javascript, languageSupport = []} = options;
  const dispatcher = d3Dispatch("userInput");
  const runtimeRef = {current: null};
  const isJavaScript = language.id === "javascript";

  const myBasicSetup = Array.from(basicSetup);
  // The block indicator shows the blocks in blockMetadataField, which each
  // language's extensions set up; without it, it shows nothing.
  myBasicSetup.splice(2, 0, blockIndicator);

  // JavaScript's support needs the runtime (for controls), so it is set up
  // here; other languages bring theirs (see ./languages/index.js).
  const languageExtensions = isJavaScript ? javascriptSupport(runtimeRef) : languageSupport;

  const state = EditorState.create({
    doc: code,
    extensions: [
      myBasicSetup,
      githubLightInit({
        styles: [
          {tag: [t.variableName], color: "#1f2328"},
          {tag: [t.function(t.variableName)], color: "#6f42c1"},
        ],
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {fontSize: "14px", fontFamily: "monospace"},
        ".cm-content": {whiteSpace: "pre"},
        ".cm-line": {wordWrap: "normal"},
      }),
      EditorView.updateListener.of(onChange),
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            runtimeRef.current?.setIsRunning(true);
            runtimeRef.current?.run();
          },
          preventDefault: true,
        },
        indentWithTab,
      ]),
      ...languageExtensions,
      ...extensions,
    ],
  });

  const view = new EditorView({state, parent: container});

  let isStopByMetaKey = false;

  function initRuntime() {
    const runtime = createRuntime(view.state.doc.toString(), {language});
    runtimeRef.current = runtime;
    runtime.onChanges(dispatch);

    // Stop the runtime when there is an error.
    runtime.onError(stop);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("openlink", onOpenLink);
  }

  function dispatch({changes, effects}) {
    // Mark this transaction as from runtime so that it will not be filtered out.
    view.dispatch({
      changes,
      effects,
      annotations: [Transaction.remote.of(true)],
    });
  }

  function onChange(update) {
    if (update.docChanged) {
      const code = update.state.doc.toString();
      runtimeRef.current?.setCode(code);
      const userEdit = update.transactions.some((tr) => tr.annotation(Transaction.userEvent));
      // Stop updating the outputs when user edit the code.
      // Prevent triggering `run` by generators, which will parse the code immediately.
      // This may lead to syntax error if inputting code is not finished.
      if (userEdit) {
        runtimeRef.current?.setIsRunning(false);
        dispatcher.call("userInput", null, code);
      }
    }
  }

  // 1. Stop running when press cmd key. This is useful when we want to open a link
  // in the comment by cmd + click. If we don't stop running, the links consistently
  // create and destroy, and there is no way to click them. This also makes sense
  // when we want to copy/paste/select code using the shortcut with cmd key.
  //
  // 2. For cmd + s, we don't want to stop running.
  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key !== "s") {
      if (runtimeRef.current?.isRunning()) isStopByMetaKey = true;
      runtimeRef.current?.setIsRunning(false);
    }
  }

  function onKeyUp(e) {
    const key = e.key;
    if ((key === "Meta" || key === "Control") && isStopByMetaKey) {
      isStopByMetaKey = false;
      runtimeRef.current?.setIsRunning(true);
    }
  }

  function onOpenLink() {
    if (!isStopByMetaKey) return;
    isStopByMetaKey = false;
    runtimeRef.current?.setIsRunning(true);
  }

  function stop() {
    runtimeRef.current?.destroy();
    runtimeRef.current = null;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("openlink", onOpenLink);
  }

  /** Run the runtime. Initialize a new runtime if it doesn't exist. */
  function run() {
    try {
      if (!runtimeRef.current) initRuntime();
      runtimeRef.current.run();
    } catch (error) {
      console.error(error);
      onError?.(error);
    }
  }

  return {
    /** @param {boolean} force - Whether to force run the code even if it's already running */
    run: (force = false) => {
      if (runtimeRef.current?.isRunning()) {
        if (force) {
          stop();
          run();
        }
        return;
      }
      run();
    },
    stop,
    on: (event, callback) => dispatcher.on(event, callback),
    destroy: () => {
      stop();
      view.destroy();
    },
  };
}
