# Vendored tree-sitter-mlscript

`tree-sitter-mlscript.wasm` and `highlights.scm` come from
[tree-sitter-mlscript](https://github.com/derppening/tree-sitter-mlscript),
branch `hkmc2-sync`, commit `0a426ed` ("Sync the grammar with hkmc2 syntax up
to PR #577"; the later `676efdc` only touches its README).

- `highlights.scm` is `queries/highlights.scm`, unchanged.
- `tree-sitter-mlscript.wasm` was built there with
  `npx tree-sitter-cli@0.26.9 build --wasm`, and is loaded with
  `web-tree-sitter` 0.26.9 (keep the two in step when updating).

Both are fetched only when an MLscript notebook loads `../mlscript.js`.
