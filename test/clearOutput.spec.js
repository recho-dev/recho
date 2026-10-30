import {it, expect} from "vitest";
import {EditorState} from "@codemirror/state";
import {removeOutputChanges} from "../runtime/index.js";

const clear = (code) =>
  EditorState.create({doc: code})
    .update({changes: removeOutputChanges(code)})
    .state.doc.toString();

it("removes output and error lines and keeps the code", () => {
  const code = `//➜ 1\n//➜ 2\necho(1);\n\n//✗ Error\nfoo();\n//➜ x\necho("x");`;
  expect(clear(code)).toBe(`echo(1);\n\nfoo();\necho("x");`);
});

it("leaves code without output unchanged", () => {
  expect(removeOutputChanges(`echo(1);\n// a comment`)).toEqual([]);
});
