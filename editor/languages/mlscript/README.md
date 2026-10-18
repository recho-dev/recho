# MLscript grammars

The tree-sitter grammar and its highlights query come from the npm package
[`@mlscript/tree-sitter-mlscript`](https://www.npmjs.com/package/@mlscript/tree-sitter-mlscript)
(`../mlscript.js` loads them from there). Keep its `tree-sitter-cli` version in
step with Recho's `web-tree-sitter` (0.26.9).

## TextMate grammar

`mlscript.tmLanguage.json` is `syntaxes/mlscript.tmLanguage.json` from
[mlscript-syntax-highlight](https://github.com/chengluyu/mlscript-syntax-highlight)
(MIT), commit `a6ad721`, unchanged. Shiki uses it to highlight MLscript code in
example and work thumbnails (`app/ThumbnailClient.js`), which load it only
when they show an MLscript notebook.
