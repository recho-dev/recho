import {describe, it, expect} from "vitest";
import {notebookDetails} from "../app/shared.js";

describe("notebookDetails", () => {
  const created = "2026-03-05T12:00:00.000Z";

  it("credits the author of someone else's notebook", () => {
    expect(notebookDetails({author: "Ada", created, isOthers: true})).toBe("Ada · Created 2026-03-05 · View only");
  });

  it("shows your own name on your notebooks", () => {
    expect(notebookDetails({author: "Me", created, isOthers: false})).toBe("Me · Created 2026-03-05");
  });

  it("leaves out the author of an older notebook without one", () => {
    expect(notebookDetails({author: undefined, created, isOthers: true})).toBe("Created 2026-03-05 · View only");
  });

  it("says when a notebook isn't saved yet", () => {
    expect(notebookDetails({author: null, created: false, isOthers: false})).toBe("Not saved yet");
  });
});
