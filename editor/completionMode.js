import {Compartment, Prec} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {acceptCompletion, closeCompletion} from "@codemirror/autocomplete";

/**
 * Compartment that holds the completion acceptance keymap.
 * Reconfigure this to switch between Tab and Enter acceptance modes.
 */
export const completionModeCompartment = new Compartment();

/**
 * In Tab mode:
 * - Tab tries to accept completion first; if no completion is active,
 *   it returns false and falls through to indentWithTab.
 * - Enter closes any active completion popup and returns false,
 *   letting the default insertNewline handler take over.
 *
 * Uses Prec.highest so these bindings take priority over the default
 * completionKeymap included in basicSetup.
 */
function tabModeKeymap() {
  return Prec.highest(
    keymap.of([
      {key: "Tab", run: acceptCompletion},
      {
        key: "Enter",
        run: (view) => {
          closeCompletion(view);
          return false;
        },
      },
    ]),
  );
}

/**
 * In Enter mode: the default completionKeymap (from basicSetup) already
 * binds Enter to acceptCompletion. Nothing extra needed.
 */
function enterModeKeymap() {
  return [];
}

/**
 * Create the initial extension for the completion mode compartment.
 * @param {"tab" | "enter"} mode
 */
export function getCompletionModeExtension(mode = "enter") {
  return completionModeCompartment.of(mode === "tab" ? tabModeKeymap() : enterModeKeymap());
}

/**
 * Reconfigure the completion acceptance mode on a live editor view.
 * @param {import("@codemirror/view").EditorView} view
 * @param {"tab" | "enter"} mode
 */
export function setCompletionMode(view, mode) {
  view.dispatch({
    effects: completionModeCompartment.reconfigure(mode === "tab" ? tabModeKeymap() : enterModeKeymap()),
  });
}
