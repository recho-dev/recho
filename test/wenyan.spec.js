import {it, expect, describe, afterEach, beforeAll} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {loadLanguage} from "../runtime/languages.js";
import {compile} from "wenyan";

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

let wenyan;

beforeAll(async () => {
  wenyan = await loadLanguage("wenyan@0.1.0");
});

// Mirrors the editor: apply the runtime's changes and feed the new code back.
function start(code) {
  let state = EditorState.create({doc: code});
  const runtime = createRuntime(code, {language: wenyan});
  runtime.onChanges((specs) => {
    state = state.update(specs).state;
    runtime.setCode(state.doc.toString());
  });
  runtime.run();
  return {
    runtime,
    doc: () => state.doc.toString(),
    edit(search, replacement) {
      const from = state.doc.toString().indexOf(search);
      state = state.update({changes: {from, to: from + search.length, insert: replacement}}).state;
      runtime.setCode(state.doc.toString());
      runtime.run();
    },
  };
}

describe("wenyan", () => {
  let notebook;
  const run = (code) => (notebook = start(code));

  afterEach(async () => {
    notebook?.runtime.destroy();
    notebook = null;
    await wait(0);
  });

  it("loads only when asked for", async () => {
    expect((await loadLanguage("javascript@0.1.0")).id).toBe("javascript");
    expect(wenyan.id).toBe("wenyan");
  });

  it("writes output as wenyan comments above the cell", async () => {
    run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。書之。\n\n吾有一言。曰「「問天地好在。」」。書之。`);
    await wait();
    expect(notebook.doc()).toBe(
      `吾有一數。曰三。名之曰「甲」。\n\n批曰。「「➜ 三」」。\n夫「甲」。書之。\n\n批曰。「「➜ 問天地好在。」」。\n吾有一言。曰「「問天地好在。」」。書之。`,
    );
  });

  it("keeps a pending value with the line that prints it", async () => {
    run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。\n書之。`);
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n夫「甲」。\n書之。`);
  });

  it("prints several values side by side, and booleans and arrays like the wenyan IDE", async () => {
    run(
      `夫三。夫「「之數」」。書之。\n\n夫陽。書之。\n\n吾有一列。名之曰「列」。\n充「列」以一以二。\n\n夫「列」。書之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三 之數」」。\n夫三。`);
    expect(notebook.doc()).toContain(`批曰。「「➜ 陽」」。\n夫陽。`);
    expect(notebook.doc()).toContain(`批曰。「「➜ 一。二」」。\n夫「列」。`);
  });

  it("accumulates through reassignment and starts over when the loop is edited", async () => {
    run(
      `吾有一數。曰零。名之曰「和」。\n\n為是十遍。\n\t加「和」以一。昔之「和」者。今其是矣。\n云云。\n\n夫「和」。書之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 一十」」。\n夫「和」。書之。`);
    notebook.edit("為是十遍。", "為是三遍。");
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n夫「和」。書之。`);
  });

  it("prints from a function above the cell that calls it", async () => {
    run(`吾有一術。名之曰「說」。是術曰。\n\t吾有一言。曰「「善」」。書之。\n是謂「說」之術也。\n\n施「說」。`);
    await wait();
    expect(notebook.doc()).toContain(`是謂「說」之術也。\n\n批曰。「「➜ 善」」。\n施「說」。`);
  });

  it("supports recursive functions", async () => {
    run(
      `吾有一術。名之曰「階乘」。欲行是術。必先得一數。曰「元」。乃行是術曰。\n\t若「元」等於一者。乃得一。云云。\n\t減「元」以一。名之曰「乙」。\n\t施「階乘」於「乙」。名之曰「丙」。\n\t乘「元」以「丙」。乃得矣。\n是謂「階乘」之術也。\n\n施「階乘」於五。書之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 一百二十」」。\n施「階乘」於五。書之。`);
  });

  it("keeps compiler temporaries private to each cell", async () => {
    run(`加一以二。名之曰「甲」。\n\n加三以四。名之曰「乙」。\n\n夫「甲」。夫「乙」。書之。`);
    await wait();
    expect(notebook.doc()).not.toContain("✗");
    expect(notebook.doc()).toContain(`批曰。「「➜ 三 七」」。`);
  });

  it("shows an error on its cell and keeps running the others", async () => {
    run(`夫「丁」。書之。\n\n夫三。書之。`);
    await wait();
    expect(notebook.doc()).toContain(
      `批曰。「「✗ { [RuntimeError: 丁 is not defined] input: "丁" }」」。\n夫「丁」。書之。`,
    );
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n夫三。書之。`);
  });

  it("shows a syntax error at its line", async () => {
    run(`夫三。書之。\n\n吾有一言。曰「「未完`);
    await wait();
    expect(notebook.doc()).toMatch(/\n\n批曰。「「✗ .*」」。\n吾有一言。曰「「未完$/);
  });

  it("is idempotent", async () => {
    run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。書之。`);
    await wait();
    const once = notebook.doc();
    notebook.runtime.run();
    await wait();
    expect(notebook.doc()).toBe(once);
  });

  it("keeps any output inside its comment", () => {
    const {formatLine, outputPrefix} = wenyan.output;
    for (const text of ["「「甲」」", "甲」", "「甲", "甲」」乙", "『甲』", "」", "」」", "「", "書之。"]) {
      const line = formatLine(outputPrefix, text);
      // The line must read back as a single comment, followed by working code.
      const js = compile(`${line}\n夫一。書之。`, {
        logCallback: () => {},
        errorCallback: (message) => {
          throw new Error(String(message));
        },
      });
      expect(js, text).toMatch(/^\/\*"➜ [^]*"\*\/const _ans1=1;console\.log\(_ans1\);$/);
    }
  });
});
