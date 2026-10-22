import {describe, it, expect} from "vitest";
import {RUNTIMES, fileNameOf} from "../app/shared.js";

describe("fileNameOf", () => {
  it("joins the title's words with dashes, in lowercase", () => {
    expect(fileNameOf("Untitled", RUNTIMES.javascript)).toBe("untitled.js");
    expect(fileNameOf("Box  Drawing Writing", RUNTIMES.mlscript)).toBe("box-drawing-writing.mls");
    expect(fileNameOf("問天地", RUNTIMES.wenyan)).toBe("問天地.wy");
  });

  it("leaves out characters a file name can't have", () => {
    expect(fileNameOf("CG: Text-Based Shaders copy", RUNTIMES.javascript)).toBe("cg-text-based-shaders-copy.js");
    expect(fileNameOf("a / b", RUNTIMES.javascript)).toBe("a-b.js");
    expect(fileNameOf("???", RUNTIMES.javascript)).toBe("untitled.js");
  });

  it("keeps an older title that is a file name already", () => {
    expect(fileNameOf("cultivate-opossum.js", RUNTIMES.javascript)).toBe("cultivate-opossum.js");
    expect(fileNameOf("palm-august copy.js", RUNTIMES.javascript)).toBe("palm-august-copy.js");
  });
});
