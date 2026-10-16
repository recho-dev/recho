import {it, expect, describe, afterEach, beforeAll} from "vitest";
import {EditorState} from "@codemirror/state";
import {createRuntime} from "../runtime/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {compile} from "wenyan";
import {RUNTIMES, highlightLanguage, languageOf} from "../app/shared.js";

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
    run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。示之。\n\n吾有一言。曰「「問天地好在。」」。示之。`);
    await wait();
    expect(notebook.doc()).toBe(
      `吾有一數。曰三。名之曰「甲」。\n\n批曰。「「➜ 三」」。\n夫「甲」。示之。\n\n批曰。「「➜ 問天地好在。」」。\n吾有一言。曰「「問天地好在。」」。示之。`,
    );
  });

  it("leaves 書之 printing to the console", async () => {
    const logs = [];
    const log = console.log;
    console.log = (...args) => logs.push(args);
    try {
      run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。書之。`);
      await wait();
    } finally {
      console.log = log;
    }
    expect(logs).toContainEqual([3]);
    expect(notebook.doc()).toBe(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。書之。`);
  });

  it("keeps a pending value with the line that shows it", async () => {
    run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。\n示之。`);
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n夫「甲」。\n示之。`);
  });

  it("prints several values side by side, and booleans and arrays like the wenyan IDE", async () => {
    run(
      `夫三。夫「「之數」」。示之。\n\n夫陽。示之。\n\n吾有一列。名之曰「列」。\n充「列」以一以二。\n\n夫「列」。示之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三 之數」」。\n夫三。`);
    expect(notebook.doc()).toContain(`批曰。「「➜ 陽」」。\n夫陽。`);
    expect(notebook.doc()).toContain(`批曰。「「➜ 一。二」」。\n夫「列」。`);
  });

  it("accumulates through reassignment and starts over when the loop is edited", async () => {
    run(
      `吾有一數。曰零。名之曰「和」。\n\n為是十遍。\n\t加「和」以一。昔之「和」者。今其是矣。\n云云。\n\n夫「和」。示之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 一十」」。\n夫「和」。示之。`);
    notebook.edit("為是十遍。", "為是三遍。");
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n夫「和」。示之。`);
  });

  it("prints from a function above the cell that calls it", async () => {
    run(`吾有一術。名之曰「說」。是術曰。\n\t吾有一言。曰「「善」」。示之。\n是謂「說」之術也。\n\n施「說」。`);
    await wait();
    expect(notebook.doc()).toContain(`是謂「說」之術也。\n\n批曰。「「➜ 善」」。\n施「說」。`);
  });

  it("supports recursive functions", async () => {
    run(
      `吾有一術。名之曰「階乘」。欲行是術。必先得一數。曰「元」。乃行是術曰。\n\t若「元」等於一者。乃得一。云云。\n\t減「元」以一。名之曰「乙」。\n\t施「階乘」於「乙」。名之曰「丙」。\n\t乘「元」以「丙」。乃得矣。\n是謂「階乘」之術也。\n\n施「階乘」於五。示之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 一百二十」」。\n施「階乘」於五。示之。`);
  });

  it("keeps compiler temporaries private to each cell", async () => {
    run(`加一以二。名之曰「甲」。\n\n加三以四。名之曰「乙」。\n\n夫「甲」。夫「乙」。示之。`);
    await wait();
    expect(notebook.doc()).not.toContain("✗");
    expect(notebook.doc()).toContain(`批曰。「「➜ 三 七」」。`);
  });

  it("shows an error on its cell and keeps running the others", async () => {
    run(`夫「丁」。示之。\n\n夫三。示之。`);
    await wait();
    expect(notebook.doc()).toContain(
      `批曰。「「✗ { [RuntimeError: 丁 is not defined] input: "丁" }」」。\n夫「丁」。示之。`,
    );
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n夫三。示之。`);
  });

  it("shows a syntax error at its line", async () => {
    run(`夫三。示之。\n\n吾有一言。曰「「未完`);
    await wait();
    expect(notebook.doc()).toMatch(/\n\n批曰。「「✗ .*」」。\n吾有一言。曰「「未完$/);
  });

  it("is idempotent", async () => {
    run(`吾有一數。曰三。名之曰「甲」。\n\n夫「甲」。示之。`);
    await wait();
    const once = notebook.doc();
    notebook.runtime.run();
    await wait();
    expect(notebook.doc()).toBe(once);
  });

  it("keeps any output inside its comment", () => {
    const {formatLine, outputPrefix} = wenyan.output;
    for (const text of [
      "「「甲」」",
      "甲」",
      "「甲",
      "甲」」乙",
      "『甲』",
      "」",
      "」」",
      "「",
      "示之。",
      "「「「甲",
      "甲」」」乙",
      "」」」」",
      "『",
      "』",
      "甲『乙",
      "甲』乙",
      "『甲』』「「",
    ]) {
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

  it("reports a name that isn't valid in JavaScript on its cell, and keeps running", async () => {
    run(`吾有一數。曰三。名之曰「甲-乙」。\n\n吾有一數。曰四。名之曰「class」。\n\n夫五。示之。`);
    await wait();
    expect(notebook.doc()).toMatch(
      /✗ .*Names must also be valid JavaScript names\.\]」」。\n吾有一數。曰三。名之曰「甲-乙」。/,
    );
    expect(notebook.doc()).toMatch(
      /✗ .*Names must also be valid JavaScript names\.\]」」。\n吾有一數。曰四。名之曰「class」。/,
    );
    expect(notebook.doc()).toContain(`批曰。「「➜ 五」」。\n夫五。示之。`);
  });

  it("runs past a comment that spans lines", async () => {
    run(`注曰。「「多\n行」」。\n\n夫三。示之。`);
    await wait();
    expect(notebook.doc()).toBe(`注曰。「「多\n行」」。\n\n批曰。「「➜ 三」」。\n夫三。示之。`);
  });

  it("inspects lists that aren't plain values, including empty ones", async () => {
    run(
      `吾有一物。名之曰「甲」。\n\n吾有一列。名之曰「乙」。\n充「乙」以「甲」。\n\n夫「乙」。示之。\n\n吾有一列。名之曰「丙」。\n\n夫「丙」。示之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ [ {} ]」」。\n夫「乙」。示之。`);
    expect(notebook.doc()).toContain(`批曰。「「➜ []」」。\n夫「丙」。示之。`);
  });

  it("shows output from a 獨行此 block above it, and keeps its names inside", async () => {
    run(`獨行此。\n\t吾有一數。曰三。名之曰「甲」。\n\t夫「甲」。示之。\n云云。\n\n夫「甲」。示之。`);
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 三」」。\n獨行此。`);
    expect(notebook.doc()).toContain(
      `批曰。「「✗ { [RuntimeError: 甲 is not defined] input: "甲" }」」。\n夫「甲」。示之。`,
    );
  });

  it("lets a 獨行此 block change a name from another block", async () => {
    run(
      `吾有一數。曰零。名之曰「和」。\n\n獨行此。\n\t加「和」以二。昔之「和」者。今其是矣。\n云云。\n\n夫「和」。示之。`,
    );
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 二」」。\n夫「和」。示之。`);
  });

  it("names the value a 獨行此 block hands out with 乃得", async () => {
    run(`獨行此。\n\t乘三以四。名之曰「積」。\n\t乃得「積」。\n云云。名之曰「乙」。\n\n夫「乙」。示之。`);
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 一十二」」。\n夫「乙」。示之。`);
  });

  it("doesn't run code commented out with 注曰。『…』。", async () => {
    run(`注曰。『 為是三遍。\n\t夫一。示之。\n云云。 』。\n\n夫二。示之。`);
    await wait();
    expect(notebook.doc()).toBe(
      `注曰。『 為是三遍。\n\t夫一。示之。\n云云。 』。\n\n批曰。「「➜ 二」」。\n夫二。示之。`,
    );
  });

  it("ticks with 刻漏 (recho.interval), re-running the blocks that read it", async () => {
    run(`施「刻漏」於二十。名之曰「刻」。\n\n夫「刻」。示之。\n\n加「刻」以一。示之。`);
    const shown = () => notebook.doc().match(/➜ (.*)」」。\n夫「刻」。示之。/)?.[1];
    await wait(30);
    const first = shown();
    expect(first).toBe("零");
    for (let i = 0; i < 50 && shown() === first; i++) await wait(20);
    expect(shown()).not.toBe(first);
    expect(notebook.doc()).toMatch(/➜ .+」」。\n加「刻」以一。示之。/);
  });

  it("lets a notebook define its own 刻漏", async () => {
    run(`吾有一數。曰七。名之曰「刻漏」。\n\n夫「刻漏」。示之。`);
    await wait();
    expect(notebook.doc()).toContain(`批曰。「「➜ 七」」。\n夫「刻漏」。示之。`);
  });

  it("keeps a line inside a string that looks like output", async () => {
    const code = `吾有一言。曰「「甲\n批曰。「「➜ 乙」」。\n丙」」。名之曰「文」。\n\n夫「文」。示之。`;
    run(code);
    await wait();
    // The line is part of the string: kept in the code, and shown with it.
    expect(notebook.doc()).toContain(`曰「「甲\n批曰。「「➜ 乙」」。\n丙」」。名之曰「文」。`);
    expect(notebook.doc()).toMatch(
      /批曰。「「➜ 甲 *」」。\n批曰。「「➜ 批曰。「 「➜ 乙」 」。」」。\n批曰。「「➜ 丙 *」」。\n夫「文」。示之。/,
    );
    notebook.runtime.run();
    await wait();
    expect(notebook.doc()).toContain(`曰「「甲\n批曰。「「➜ 乙」」。\n丙」」。名之曰「文」。`);
  });

  it("keeps a function whose body starts on a later line together", async () => {
    run(`吾有一術。名之曰「說」。\n是術曰。\n乃得一。\n是謂「說」之術也。\n\n施「說」。示之。`);
    await wait();
    expect(notebook.doc()).not.toContain("✗");
    expect(notebook.doc()).toContain(`批曰。「「➜ 一」」。\n施「說」。示之。`);
  });

  it("doesn't make blocks of comments", () => {
    const code = `注曰。「「多\n行」」。\n\n疏曰。「「疏」」。\n夫三。示之。\n\n批曰。「「批」」。夫四。示之。`;
    const cells = wenyan.cells(code).map(({start, end}) => code.slice(start, end));
    expect(cells).toEqual(["夫三。示之。", "批曰。「「批」」。夫四。示之。"]);
  });
});

describe("loadLanguage", () => {
  it("rejects a language it doesn't know instead of running it as JavaScript", async () => {
    await expect(loadLanguage("python@0.1.0")).rejects.toThrow('Unknown language "python@0.1.0"');
  });
});

describe("runtimes", () => {
  it("names the language of a runtime and how to highlight it", () => {
    expect(languageOf(RUNTIMES.wenyan)).toBe("wenyan");
    expect(languageOf(RUNTIMES.javascript)).toBe("javascript");
    expect(languageOf()).toBe("javascript");
    expect(highlightLanguage(RUNTIMES.wenyan)).toBe("text");
    expect(highlightLanguage(undefined)).toBe("javascript");
  });
});

describe("JavaScript notebooks", () => {
  it("don't get wenyan's names", async () => {
    let state = EditorState.create({doc: "echo(刻漏);"});
    const runtime = createRuntime(state.doc.toString());
    runtime.onChanges((specs) => {
      state = state.update(specs).state;
      runtime.setCode(state.doc.toString());
    });
    runtime.run();
    await wait();
    runtime.destroy();
    expect(state.doc.toString()).toContain("刻漏 is not defined");
  });
});
