import {EditorView, basicSetup} from "codemirror";
import {EditorState, Transaction} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";
import {indentWithTab} from "@codemirror/commands";
import {createRuntime, removeOutputChanges} from "../runtime/index.js";
import {javascript} from "../runtime/languages/javascript.js";
import {dispatch as d3Dispatch} from "d3-dispatch";
import {blockIndicator, runButtonGutter} from "./blocks";
import {javascriptSupport} from "./languages/javascript.js";

/**
 * The editor's look, from the tokens in app/tokens.css. CodeMirror scopes a
 * theme above its base theme, so these win without `!important`.
 */
const rechoTheme = EditorView.theme({
  "&": {fontSize: "var(--fs-code)", color: "var(--ink)", backgroundColor: "var(--surface)"},
  ".cm-scroller": {fontFamily: "var(--font-mono)", lineHeight: "var(--lh-code)"},
  ".cm-content": {whiteSpace: "pre", padding: "var(--space-2) 0", caretColor: "var(--ink)"},
  ".cm-line": {wordWrap: "normal", paddingRight: "var(--space-4)"},
  ".cm-cursor, .cm-dropCursor": {borderLeftColor: "var(--ink)"},
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {backgroundColor: "var(--selection)"},
  ".cm-gutters": {backgroundColor: "var(--surface)", color: "var(--ink-4)", border: "none"},
  // Folding stays on the keyboard (Ctrl-Shift-[); the gutter goes.
  // CodeMirror shows gutters with `!important`, so hiding one needs it too.
  ".cm-foldGutter": {display: "none !important"},
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "calc(2ch + var(--space-3) * 2)",
    padding: "0 var(--space-3)",
    fontSize: "var(--fs-gutter)",
    fontVariantNumeric: "tabular-nums",
  },
  // The active line shows only while the editor has focus.
  ".cm-activeLine, .cm-activeLineGutter": {backgroundColor: "var(--clear)"},
  "&.cm-focused .cm-activeLine, &.cm-focused .cm-activeLineGutter": {backgroundColor: "var(--active-line)"},
  "&.cm-focused .cm-activeLineGutter": {color: "var(--ink-2)"},
  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {backgroundColor: "var(--fill-pressed)"},
  ".cm-selectionMatch": {backgroundColor: "var(--fill-hover)"},
  ".cm-searchMatch": {
    backgroundColor: "var(--warning-tint)",
    outline: "var(--border-width) solid var(--warning-marker)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--surface)",
    color: "var(--ink)",
    border: "var(--border-width) solid var(--line)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-3)",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete > ul > li": {padding: "1px var(--space-2)"},
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {backgroundColor: "var(--selection)", color: "var(--ink)"},
  ".cm-completionDetail, .cm-completionMatchedText": {color: "var(--ink-3)"},
  ".cm-panels": {backgroundColor: "var(--sunken)", color: "var(--ink)"},
  ".cm-panels.cm-panels-bottom": {borderTop: "var(--border-width) solid var(--line)"},
  ".cm-textfield": {
    backgroundColor: "var(--surface)",
    border: "var(--border-width) solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: "var(--surface)",
    border: "var(--border-width) solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
});

/** Syntax colours: one lightness, separated by hue (see --syn-* in app/tokens.css). */
const rechoHighlightStyle = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword, t.operatorKeyword, t.modifier, t.self],
    color: "var(--syn-keyword)",
  },
  {tag: [t.string, t.special(t.string), t.regexp, t.escape], color: "var(--syn-string)"},
  {tag: [t.number, t.bool, t.null, t.atom, t.constant(t.variableName)], color: "var(--syn-number)"},
  {
    tag: [
      t.function(t.variableName),
      t.function(t.propertyName),
      t.function(t.definition(t.variableName)),
      t.className,
      t.typeName,
      t.namespace,
      t.macroName,
    ],
    color: "var(--syn-function)",
  },
  {tag: [t.propertyName, t.definition(t.propertyName)], color: "var(--syn-property)"},
  {tag: [t.operator, t.punctuation, t.separator, t.bracket, t.derefOperator], color: "var(--syn-operator)"},
  {tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--syn-comment)"},
  {tag: [t.meta, t.annotation, t.tagName], color: "var(--syn-tag)"},
  {tag: [t.variableName, t.definition(t.variableName), t.standard(t.variableName)], color: "var(--ink)"},
  {tag: t.invalid, color: "var(--error)"},
  {tag: t.link, textDecoration: "underline"},
  {tag: t.emphasis, fontStyle: "italic"},
  {tag: t.strong, fontWeight: "bold"},
]);

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.code
 * @param {(error: any) => void} [options.onError]
 * @param {import("@codemirror/state").Extension[]} [options.extensions]
 * @param {object} [options.language] - The notebook's language (see
 *   ../runtime/languages/index.js), JavaScript by default.
 * @param {import("@codemirror/state").Extension[] | ((runtimeRef: {current: any}) => import("@codemirror/state").Extension[])} [options.languageSupport] -
 *   Editor extensions for a language other than JavaScript (see
 *   ./languages/index.js), or a function of the runtime giving them.
 */
export function createEditor(container, options) {
  const {code, onError, extensions = [], language = javascript, languageSupport = []} = options;
  const dispatcher = d3Dispatch("userInput", "status", "run");
  const runtimeRef = {current: null};
  const isJavaScript = language.id === "javascript";

  const myBasicSetup = Array.from(basicSetup);
  // The block indicator shows the blocks in blockMetadataField, which each
  // language's extensions set up; without it, it shows nothing.
  myBasicSetup.splice(2, 0, blockIndicator);
  // Each block's play button goes right after the line numbers.
  myBasicSetup.splice(1, 0, runButtonGutter(runCells));

  // JavaScript's support needs the runtime (for controls), so it is set up
  // here; other languages bring theirs (see ./languages/index.js), as a
  // function when they need the runtime too.
  const languageExtensions = isJavaScript
    ? javascriptSupport(runtimeRef)
    : typeof languageSupport === "function"
      ? languageSupport(runtimeRef)
      : languageSupport;

  const state = EditorState.create({
    doc: code,
    extensions: [
      myBasicSetup,
      rechoTheme,
      syntaxHighlighting(rechoHighlightStyle),
      EditorView.lineWrapping,
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

    // E.g. whether the language is taking long to compile.
    runtime.onStatus((status) => dispatcher.call("status", null, status));

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
    // Measure the new lines now rather than at the next frame. Until then the
    // editor lays them out at an estimated height, and output lines are
    // shorter than code lines, so with output changing every frame (e.g. an
    // animation) the gutters below would sit off from the text most of the
    // time: their buttons lose hover and miss presses. `measure` is internal
    // to CodeMirror, so this falls back to its usual scheduling without it.
    if (changes.length) view.measure?.();
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

  /**
   * Stop running and remove every output line, e.g. to make the editor
   * usable again after printing too much. It's an edit, so it can be undone.
   */
  function clear() {
    stop();
    const changes = removeOutputChanges(view.state.doc.toString(), language);
    if (changes.length) view.dispatch({changes, userEvent: "delete.clear"});
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

  /** Run the blocks whose source contains one of `positions` again, with the blocks that read them. */
  function runCells(positions) {
    try {
      // A new runtime runs every block anyway.
      if (!runtimeRef.current) {
        initRuntime();
        runtimeRef.current.run();
      } else {
        runtimeRef.current.runCells(positions);
      }
    } catch (error) {
      console.error(error);
      onError?.(error);
    }
    dispatcher.call("run");
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
    clear,
    on: (event, callback) => dispatcher.on(event, callback),
    destroy: () => {
      stop();
      view.destroy();
    },
  };
}
