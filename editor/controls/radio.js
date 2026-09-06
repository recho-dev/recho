import {EditorView, Decoration, ViewUpdate, ViewPlugin, WidgetType} from "@codemirror/view";
import {Transaction} from "@codemirror/state";
import {syntaxTree} from "@codemirror/language";

const WIDGET_CLASS_NAME = "cm-radio-button";

class RadioWidget extends WidgetType {
  #isSelected;
  #index;
  #groupId;

  /**
   *
   * @param {boolean} isSelected
   * @param {number} index
   * @param {string} groupId
   */
  constructor(isSelected, index, groupId) {
    super();
    this.#isSelected = isSelected;
    this.#index = index;
    this.#groupId = groupId;
  }

  eq(other) {
    return (
      other instanceof RadioWidget &&
      other.#isSelected === this.#isSelected &&
      other.#index === this.#index &&
      other.#groupId === this.#groupId
    );
  }

  toDOM() {
    let wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    wrap.className = WIDGET_CLASS_NAME;
    wrap.style.marginRight = "4px";

    let radio = document.createElement("input");
    radio.type = "radio";
    radio.name = this.#groupId;
    radio.checked = this.#isSelected;
    radio.dataset.index = this.#index.toString();
    radio.dataset.groupId = this.#groupId;
    radio.style.margin = "0";
    radio.style.verticalAlign = "middle";

    wrap.appendChild(radio);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

class RadioPlugin {
  #decorations;

  /**
   *
   * @param {EditorView} view
   */
  constructor(view) {
    this.#decorations = RadioPlugin.createRadioWidgets(view);
  }

  /**
   * Update the radio widgets based on the view update.
   * @param {ViewUpdate} update
   */
  update(update) {
    if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) != syntaxTree(update.state))
      this.#decorations = RadioPlugin.createRadioWidgets(update.view);
  }

  get decorations() {
    return this.#decorations;
  }

  /**
   *
   * @param {EditorView} view
   * @returns
   */
  static createRadioWidgets(view) {
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
            if (view.state.doc.sliceString(propertyNameNode.from, propertyNameNode.to) !== "radio") return;

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

            if (args.length !== 2) return; // Need exactly index and options array

            // First argument should be the index (number)
            const indexArg = args[0];
            if (!/^\d+$/.test(indexArg.text)) return;
            const selectedIndex = parseInt(indexArg.text);

            // Second argument should be an array of options
            const optionsArg = args[1];

            // Parse the array literal to extract individual options
            let optionValues = [];
            if (optionsArg.node.name === "ArrayExpression") {
              let optionNode = optionsArg.node.firstChild?.nextSibling; // Skip opening bracket

              while (optionNode && optionNode.name !== "]") {
                if (optionNode.name !== ",") {
                  optionValues.push({
                    from: optionNode.from,
                  });
                }
                optionNode = optionNode.nextSibling;
              }
            } else {
              return; // Not an array literal, can't parse
            }

            if (optionValues.length === 0) return; // No options found

            // Create a unique group ID for this radio group
            const groupId = `radio-${node.from}-${node.to}`;

            // Create radio widgets for each option value
            optionValues.forEach((option, valueIndex) => {
              const isSelected = valueIndex === selectedIndex;
              widgets.push(
                Decoration.widget({
                  widget: new RadioWidget(isSelected, valueIndex, groupId),
                  side: -1,
                }).range(option.from),
              );
            });
          }
        },
      });
    }
    return Decoration.set(widgets);
  }
}

/**
 * Create a radio extension for the editor.
 * @param {*} runtimeRef
 * @returns {ViewPlugin<RadioPlugin, undefined>}
 */
export function radio(runtimeRef) {
  /**
   * Update the index value at the given position in the editor.
   * @param {EditorView} view
   * @param {string} groupId
   * @param {number} newIndex
   * @returns {boolean} if the update was successful
   */
  function updateRadioIndex(view, groupId, newIndex) {
    // Extract call positions from groupId
    const match = groupId.match(/radio-(\d+)-(\d+)/);
    if (!match) return false;

    const callStart = parseInt(match[1]);
    const callEnd = parseInt(match[2]);
    const callText = view.state.doc.sliceString(callStart, callEnd);

    // Parse the call to find the first argument (index)
    const indexMatch = callText.match(/^recho\.radio\s*\(\s*(\d+)/);
    if (!indexMatch) return false;

    const oldIndex = indexMatch[1];
    const indexStart = callStart + indexMatch.index + indexMatch[0].length - oldIndex.length;
    const indexEnd = indexStart + oldIndex.length;

    const change = {
      from: indexStart,
      to: indexEnd,
      insert: newIndex.toString(),
    };

    view.dispatch({
      changes: change,
      annotations: [Transaction.remote.of("control.radio")],
    });

    runtimeRef.current.run();

    return true;
  }

  return ViewPlugin.fromClass(RadioPlugin, {
    decorations: (v) => v.decorations,
    eventHandlers: {
      change: ({target}, view) => {
        if (target.nodeName === "INPUT" && target.type === "radio" && target.closest(`.${WIDGET_CLASS_NAME}`)) {
          const newIndex = parseInt(target.dataset.index);
          const groupId = target.dataset.groupId;
          return updateRadioIndex(view, groupId, newIndex);
        }
      },
    },
  });
}
