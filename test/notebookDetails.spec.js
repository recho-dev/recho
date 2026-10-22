import {describe, it, expect} from "vitest";
import {notebookDetails, ownerNameOf} from "../app/shared.js";

describe("ownerNameOf", () => {
  it("uses the display name", () => {
    expect(ownerNameOf({displayName: "Ada Lovelace", email: "ada@example.com"})).toBe("Ada Lovelace");
  });

  it("falls back to the email's local part, never the full email", () => {
    expect(ownerNameOf({displayName: null, email: "ada@example.com"})).toBe("ada");
    expect(ownerNameOf({displayName: "  ", email: "ada@example.com"})).toBe("ada");
  });

  it("is null without a name or email", () => {
    expect(ownerNameOf({displayName: null, email: null})).toBe(null);
    expect(ownerNameOf(null)).toBe(null);
  });
});

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
