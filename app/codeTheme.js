/**
 * Shiki's theme for thumbnails. Its colours are the syntax tokens of
 * tokens.css as CSS variables, the same as the editor's, so thumbnails follow
 * the light and dark themes.
 */
export const codeTheme = {
  name: "recho",
  type: "light",
  colors: {"editor.foreground": "var(--ink)", "editor.background": "var(--clear)"},
  settings: [
    {settings: {foreground: "var(--ink)", background: "var(--clear)"}},
    {scope: ["comment", "punctuation.definition.comment"], settings: {foreground: "var(--syn-comment)"}},
    {scope: ["string", "punctuation.definition.string", "string.regexp"], settings: {foreground: "var(--syn-string)"}},
    {
      scope: ["constant.numeric", "constant.language", "constant.character"],
      settings: {foreground: "var(--syn-number)"},
    },
    {scope: ["keyword", "storage", "variable.language"], settings: {foreground: "var(--syn-keyword)"}},
    {scope: ["keyword.operator", "punctuation"], settings: {foreground: "var(--syn-operator)"}},
    {scope: ["keyword.operator.new", "keyword.operator.expression"], settings: {foreground: "var(--syn-keyword)"}},
    {
      scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function"],
      settings: {foreground: "var(--syn-function)"},
    },
    {
      scope: ["variable.other.property", "variable.other.object.property", "support.variable.property"],
      settings: {foreground: "var(--syn-property)"},
    },
  ],
};
