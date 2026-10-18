# MLscript grammar

The tree-sitter grammar and its highlights query come from the npm package
[`@mlscript/tree-sitter-mlscript`](https://www.npmjs.com/package/@mlscript/tree-sitter-mlscript).
In the browser, `grammar.js` loads them; at build time, `app/examples/thumbnails.js`
reads them from `node_modules`. The editor (`../mlscript.js`) and the thumbnails of
MLscript examples and works (`highlight.js`) both highlight with them. Keep the
package's `tree-sitter-cli` version in step with Recho's `web-tree-sitter` (0.26.9).
