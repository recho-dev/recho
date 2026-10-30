import {syntaxTree} from "@codemirror/language";

function toApplyCompletion(template) {
  const offset = template.indexOf("$");
  const insert = offset < 0 ? template : template.slice(0, offset) + template.slice(offset + 1);
  return (view, _completion, from, to) => {
    view.dispatch({
      changes: [{from, to, insert}],
      selection: offset < 0 ? {anchor: from + template.length} : {anchor: from + offset},
    });
  };
}

/** @type {import("@codemirror/autocomplete").Completion} */
const builtinFunctions = [
  {
    label: "echo",
    type: "function",
    detail: "(value: any)",
    info: "Echos the output above the current block.",
    apply: toApplyCompletion("echo($)"),
  },
  {
    label: "clear",
    type: "function",
    detail: "()",
    info: "Clears the output of the current block.",
    apply: toApplyCompletion("echo.clear()"),
  },
  {
    label: "key",
    type: "function",
    detail: "(key: string)",
    info: "Specifies a key for the following output values.",
    apply: toApplyCompletion("echo.key($)"),
  },
  {
    label: "dispose",
    type: "function",
    detail: "(callback: Function)",
    info: "Registers a disposal callback that runs before re-running the current block.",
    apply: toApplyCompletion("echo.dispose($)"),
  },
  {
    label: "state",
    type: "function",
    detail: "(value: any)",
    info: "Creates a reactive state variable for a mutable value.",
    apply: toApplyCompletion("recho.state($)"),
  },
  {
    label: "inspect",
    type: "function",
    detail: "(value: any, options: { depth?: number, maxLength?: number })",
    info: "Formats a value for inspection.",
    apply: toApplyCompletion("recho.inspect($, {})"),
  },
  {
    label: "md",
    type: "function",
    detail: "`markdown`",
    info: "Renders Markdown as coloured text, for echo to show.",
    apply: toApplyCompletion("recho.md`$`"),
  },
  {
    label: "now",
    type: "function",
    detail: "()",
    info: "Returns a generator that yields the current time continuously.",
    apply: toApplyCompletion("recho.now()"),
  },
  {
    label: "interval",
    type: "function",
    detail: "(intervalInMilliseconds: number)",
    info: "Returns a generator that yields values at a specified interval.",
    apply: toApplyCompletion("recho.interval($)"),
  },
  {
    label: "require",
    detail: "(...names: string[])",
    type: "function",
    info: "Imports one or more JavaScript packages. The import specifiers must be valid npm package names with optional version specifiers.",
    apply: toApplyCompletion('recho.require("$")'),
  },
  {
    label: "toggle",
    detail: "(value: boolean)",
    type: "function",
    info: "Display an interactive toggle in the editor.",
    apply: toApplyCompletion("recho.toggle($)"),
  },
  {
    label: "number",
    detail: "(value: number, { min?, max?, step? })",
    type: "function",
    info: "Display a stepper control for a number value using a given step length within a specified range.",
    apply: toApplyCompletion("recho.number($)"),
  },
  {
    label: "radio",
    detail: "(index: number, options: any[])",
    type: "function",
    info: "Display an interactive radio button group in the editor.",
    apply: toApplyCompletion("recho.radio($, [])"),
  },
];

/**
 *
 * @param {import("@codemirror/autocomplete").CompletionContext} context
 * @returns {import("@codemirror/autocomplete").CompletionResult | null}
 */
export function rechoCompletion(context) {
  const tree = syntaxTree(context.state);
  const nodeBefore = tree.resolveInner(context.pos, -1);
  if (nodeBefore.name === "VariableName") {
    return {
      from: nodeBefore.from,
      validFor: /^(?:\w*)?$/,
      options: builtinFunctions,
    };
  } else if (nodeBefore.name === "BlockComment") {
    return {
      from: nodeBefore.from,
      validFor: /^(?:\w*)?$/,
      options: [
        {
          label: "/**",
          type: "comment",
          detail: " */",
          info: "Enters a comment block.",
          apply: toApplyCompletion("/**\n * $\n */"),
        },
      ],
    };
  } else {
    return null;
  }
}
