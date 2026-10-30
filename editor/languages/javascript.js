import {javascript, javascriptLanguage, esLint} from "@codemirror/lang-javascript";
import {linter} from "@codemirror/lint";
import {browser} from "globals";
import * as eslint from "eslint-linter-browserify";
import {controls} from "../controls/index.js";
import {rechoCompletion} from "../completion.js";
import {docStringTag} from "../docStringTag.js";
import {builtinHighlight} from "../builtinHighlight.js";
import {commentLink, commentLinkClickHandler} from "../commentLink.js";
import {blockExtensions} from "../blocks";

// @see https://github.com/UziTech/eslint-linter-browserify/blob/master/example/script.js
// @see https://codemirror.net/examples/lint/
const eslintConfig = {
  languageOptions: {
    globals: {
      ...browser,
    },
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
};

/**
 * Editor support for JavaScript: highlighting, completion, blocks, controls
 * (sliders, buttons, ...), built-in names, doc tags, comment links and linting. Controls talk
 * to the editor's runtime through `runtimeRef`.
 */
export function javascriptSupport(runtimeRef) {
  return [
    javascript(),
    javascriptLanguage.data.of({autocomplete: rechoCompletion}),
    blockExtensions,
    controls(runtimeRef),
    // Disable this for now, because it prevents copying/pasting the code.
    // outputProtection(),
    docStringTag,
    builtinHighlight,
    commentLink,
    commentLinkClickHandler,
    linter(esLint(new eslint.Linter(), eslintConfig)),
  ];
}
