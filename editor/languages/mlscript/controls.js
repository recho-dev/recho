// The controls (toggles, number inputs and radio buttons) of MLscript
// notebooks: the widgets and write-back of ../../controls, with the calls found
// in the tree-sitter tree instead of the Lezer JavaScript one.

import {StateField} from "@codemirror/state";
import {Query} from "web-tree-sitter";
import {toggle} from "../../controls/toggle.js";
import {radio} from "../../controls/radio.js";
import {number, numberInputsFieldFor, parseNumberLiteral} from "../../controls/number.js";

/**
 * Calls of `recho.<control>(value, options?)` whose first argument is a
 * literal. A negative number is a unary expression.
 */
const CONTROL_QUERY = `
(application
  (selection (identifier) @obj (identifier) @control)
  (arguments . [(boolean_literal) (integer_literal) (decimal_literal)
                (unary_expression (operator) @sign [(integer_literal) (decimal_literal)])] @value
     . (_)? @options)
  (#eq? @obj "recho")
  (#any-of? @control "toggle" "number" "radio")) @call
`;

export const controlQuery = (language) => new Query(language, CONTROL_QUERY);

/** The arguments of a call, without comments. */
const argumentsOf = (value) => value.parent.namedChildren.filter((node) => node.type !== "comment");

/** A number literal node (possibly negative) as `[value, format]`, or null. */
function numberOf(node) {
  if (node.type === "integer_literal" || node.type === "decimal_literal") return parseNumberLiteral(node.text);
  if (node.type === "unary_expression" && node.childCount === 2) {
    const [operator, operand] = node.children;
    if (operator.text !== "-" || (operand.type !== "integer_literal" && operand.type !== "decimal_literal"))
      return null;
    // Not `parseNumberLiteral("-" + ...)`, which drops the sign of `-3.5`.
    const parsed = parseNumberLiteral(operand.text);
    return parsed && [-parsed[0], parsed[1]];
  }
  return null;
}

/**
 * The calls of `recho.toggle`, `recho.number` and `recho.radio` in `tree`,
 * sorted by position, in CodeMirror positions (nodes report UTF-16 indices).
 * @returns {({control: "toggle", from: number, checked: boolean}
 *   | {control: "number", from: number, to: number, value: number, format: string, min: number, max: number, step: number}
 *   | {control: "radio", from: number, to: number, selectedIndex: number, options: number[]})[]}
 */
export function findControls(query, tree) {
  const controls = [];
  for (const match of query.matches(tree.rootNode)) {
    const c = Object.fromEntries(match.captures.map(({name, node}) => [name, node]));
    const {value, options} = c;
    const args = argumentsOf(value);
    switch (c.control.text) {
      case "toggle":
        if (value.type !== "boolean_literal" || args.length !== 1) break;
        controls.push({control: "toggle", from: value.startIndex, checked: value.text === "true"});
        break;
      case "number": {
        const parsed = numberOf(value);
        if (!parsed) break;
        let min = -Infinity;
        let max = Infinity;
        let step = 1;
        if (options?.type === "record") {
          for (const field of options.namedChildren) {
            // `name: value`, where the colon may not be a child.
            if (field.type !== "infix_application" || field.namedChildCount < 2) continue;
            const option = numberOf(field.namedChild(field.namedChildCount - 1));
            if (!option) continue;
            const name = field.namedChild(0).text;
            if (name === "min") min = option[0];
            else if (name === "max") max = option[0];
            else if (name === "step") step = option[0];
          }
        }
        const [number, format] = parsed;
        controls.push({
          control: "number",
          from: value.startIndex,
          to: value.endIndex,
          value: number,
          format,
          min,
          max,
          step,
        });
        break;
      }
      case "radio": {
        // The write-back rewrites the digits after `recho.radio(`.
        if (value.type !== "integer_literal" || !/^\d+$/.test(value.text)) break;
        if (args.length !== 2 || options?.type !== "tuple") break;
        const choices = options.namedChildren.filter((node) => node.type !== "comment");
        if (choices.length === 0) break;
        controls.push({
          control: "radio",
          from: c.call.startIndex,
          to: c.call.endIndex,
          selectedIndex: parseInt(value.text),
          options: choices.map((node) => node.startIndex),
        });
        break;
      }
    }
  }
  return controls;
}

/**
 * The toggles, number inputs and radio buttons of an MLscript notebook, from
 * the tree in `treeField`. Controls run the notebook through `runtimeRef`.
 */
export function mlscriptControls(language, treeField, runtimeRef) {
  const query = controlQuery(language);
  const controlsField = StateField.define({
    create: (state) => findControls(query, state.field(treeField)),
    update: (controls, tr) => (tr.docChanged ? findControls(query, tr.state.field(treeField)) : controls),
  });
  const ofKind = (state, kind) => state.field(controlsField).filter((c) => c.control === kind);
  return [
    controlsField,
    toggle(runtimeRef, (view) => ofKind(view.state, "toggle")),
    radio(runtimeRef, (view) => ofKind(view.state, "radio")),
    number(
      runtimeRef,
      numberInputsFieldFor((state) => ofKind(state, "number")),
    ),
  ];
}
