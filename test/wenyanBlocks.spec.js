import {it, expect, describe} from "vitest";
import {EditorState} from "@codemirror/state";
import {wenyanSupport} from "../editor/languages/wenyan.js";
import {outputLinesField} from "../editor/blocks/output.ts";
import {blockMetadataField} from "../editor/blocks/state.ts";
import {blockMetadataEffect} from "../editor/blocks/effect.ts";
import {BlockMetadata} from "../editor/blocks/BlockMetadata.ts";

const create = (doc) => EditorState.create({doc, extensions: wenyanSupport()});

/** The output lines of `state`, as "line number: type". */
const outputLines = (state) =>
  state.field(outputLinesField).map(({from, type}) => `${state.doc.lineAt(from).number}: ${type}`);

describe("wenyan output lines", () => {
  it("finds output and error lines", () => {
    const state = create(`批曰。「「➜ 三」」。\n夫三。示之。\n\n批曰。「「✗ 錯」」。\n夫「丁」。示之。`);
    expect(outputLines(state)).toEqual(["1: output", "4: error"]);
  });

  it("skips a line inside a string that looks like output", () => {
    const state = create(`吾有一言。曰「「甲\n批曰。「「➜ 乙」」。\n丙」」。名之曰「文」。`);
    expect(outputLines(state)).toEqual([]);
  });

  it("follows edits", () => {
    const state = create(`夫三。示之。`);
    const tr = state.update({changes: {from: 0, insert: "批曰。「「➜ 三」」。\n"}});
    expect(outputLines(tr.state)).toEqual(["1: output"]);
  });
});

describe("wenyan blocks", () => {
  const doc = `批曰。「「➜ 三」」。\n夫三。示之。\n\n夫四。示之。`;
  // Two blocks, as the runtime would send them after a run.
  const firstFrom = doc.indexOf("夫三");
  const secondFrom = doc.indexOf("夫四");
  const first = new BlockMetadata("a", "", {from: 0, to: firstFrom}, {from: firstFrom, to: firstFrom + 6});
  const second = new BlockMetadata("b", "", null, {from: secondFrom, to: secondFrom + 6});

  function withBlocks() {
    const state = create(doc);
    return state.update({effects: blockMetadataEffect.of([first, second])}).state;
  }

  it("takes the blocks the runtime sends", () => {
    const blocks = withBlocks().field(blockMetadataField);
    expect(blocks.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("moves blocks along with an edit instead of re-detecting them", () => {
    const state = withBlocks();
    // Type three characters inside the first block's source.
    const tr = state.update({changes: {from: firstFrom + 3, insert: "夫五。"}});
    const blocks = tr.state.field(blockMetadataField);
    expect(blocks.map((b) => b.id)).toEqual(["a", "b"]);
    expect(blocks[0].source).toEqual({from: firstFrom, to: firstFrom + 9});
    expect(blocks[1].source).toEqual({from: secondFrom + 3, to: secondFrom + 9});
  });

  it("drops a block whose source is deleted", () => {
    const state = withBlocks();
    const tr = state.update({changes: {from: secondFrom, to: secondFrom + 6, insert: ""}});
    expect(tr.state.field(blockMetadataField).map((b) => b.id)).toEqual(["a"]);
  });
});
