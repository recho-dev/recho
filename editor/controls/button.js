import {Decoration, ViewPlugin, WidgetType} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";

const WIDGET_CLASS_NAME = "cm-button-widget";

class ButtonWidget extends WidgetType {
  #id;
  #label;

  /**
   * @param {string} id - Button ID (label or custom ID)
   * @param {string} label - Button label text
   */
  constructor(id, label) {
    super();
    this.#id = id;
    this.#label = label;
  }

  eq(other) {
    return other instanceof ButtonWidget && other.#id === this.#id && other.#label === this.#label;
  }

  toDOM() {
    let button = document.createElement("button");
    button.className = WIDGET_CLASS_NAME;
    button.textContent = this.#label;
    button.dataset.buttonId = this.#id;

    // Styled by .cm-button-widget in ../index.css.

    // Prevent editor from handling mouse events on the button
    button.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    return button;
  }

  ignoreEvent() {
    return false;
  }
}

class ButtonPlugin {
  #decorations;

  /**
   * @param {EditorView} view
   */
  constructor(view) {
    this.#decorations = ButtonPlugin.createButtonWidgets(view);
  }

  /**
   * Update the button widgets based on the view update.
   * @param {ViewUpdate} update
   */
  update(update) {
    if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) != syntaxTree(update.state))
      this.#decorations = ButtonPlugin.createButtonWidgets(update.view);
  }

  get decorations() {
    return this.#decorations;
  }

  /**
   * Parse button calls and create widgets.
   * Supports both:
   * - recho.button(label, callback) -> ID is label
   * - recho.button(label, id, callback) -> ID is the custom id
   *
   * @param {EditorView} view
   * @returns {DecorationSet}
   */
  static createButtonWidgets(view) {
    let widgets = [];

    for (let {from, to} of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (node.name === "CallExpression") {
            const memberExpression = node.node.firstChild;
            if (memberExpression.name !== "MemberExpression") return;

            const variableNameNode = memberExpression.firstChild;
            const propertyNameNode = memberExpression.lastChild;
            if (variableNameNode.name !== "VariableName") return;
            if (propertyNameNode.name !== "PropertyName") return;

            if (view.state.doc.sliceString(variableNameNode.from, variableNameNode.to) !== "recho") return;
            if (view.state.doc.sliceString(propertyNameNode.from, propertyNameNode.to) !== "button") return;

            // Find the ArgList
            const argList = node.node.lastChild;
            if (argList.name !== "ArgList") return;

            let args = [];
            let argNode = argList.firstChild?.nextSibling; // Skip opening paren

            while (argNode && argNode.name !== ")") {
              if (argNode.name !== ",") {
                args.push({
                  from: argNode.from,
                  to: argNode.to,
                  text: view.state.doc.sliceString(argNode.from, argNode.to),
                  node: argNode,
                });
              }
              argNode = argNode.nextSibling;
            }

            let id, label;

            if (args.length === 2) {
              // recho.button(label, callback) - use label as ID
              const labelArg = args[0];

              if (labelArg.node.name === "String") {
                label = labelArg.text.slice(1, -1); // Remove quotes
                id = label; // Use label as ID
              } else {
                return; // Not a string literal, can't display
              }
            } else if (args.length === 3) {
              // recho.button(label, id, callback) - use custom ID
              const labelArg = args[0];
              const idArg = args[1];

              if (labelArg.node.name === "String") {
                label = labelArg.text.slice(1, -1); // Remove quotes
              } else {
                return; // Label must be a string literal
              }

              if (idArg.node.name === "String") {
                id = idArg.text.slice(1, -1); // Remove quotes
              } else {
                return; // ID must be a string literal
              }
            } else {
              return; // Invalid number of arguments
            }

            // Create button widget at the end of the call expression
            widgets.push(
              Decoration.widget({
                widget: new ButtonWidget(id, label),
                side: 1, // Place after the call
              }).range(node.to),
            );
          }
        },
      });
    }
    return Decoration.set(widgets);
  }
}

/**
 * Create a button extension for the editor.
 * @param {*} runtimeRef - Reference to the runtime instance
 * @returns {ViewPlugin<ButtonPlugin, undefined>}
 */
export function button(runtimeRef) {
  /**
   * Execute a button callback by ID.
   * @param {string} buttonId
   * @returns {boolean} if the execution was successful
   */
  function executeButtonCallback(buttonId) {
    if (!runtimeRef.current || !runtimeRef.current.buttonRegistry) {
      console.warn("Runtime or button registry not available");
      return false;
    }

    try {
      runtimeRef.current.buttonRegistry.executeCallback(buttonId);
      return true;
    } catch (error) {
      console.error("Error executing button callback:", error);
      return false;
    }
  }

  return ViewPlugin.fromClass(ButtonPlugin, {
    decorations: (v) => v.decorations,
    eventHandlers: {
      click: (event, view) => {
        if (event.target.nodeName === "BUTTON" && event.target.classList.contains(WIDGET_CLASS_NAME)) {
          const buttonId = event.target.dataset.buttonId;
          event.preventDefault();
          return executeButtonCallback(buttonId);
        }
      },
    },
  });
}
