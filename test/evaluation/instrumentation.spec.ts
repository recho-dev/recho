import {describe, expect, it} from "vitest";
import {shouldRecordEvaluationTransaction} from "../../app/evaluation/instrumentation.ts";

describe("shouldRecordEvaluationTransaction", () => {
  it("records local document changes without a userEvent annotation", () => {
    expect(
      shouldRecordEvaluationTransaction({
        docChanged: true,
        selectionChanged: false,
        remote: undefined,
      }),
    ).toBe(true);
  });

  it("records local selection-only changes", () => {
    expect(
      shouldRecordEvaluationTransaction({
        docChanged: false,
        selectionChanged: true,
        remote: undefined,
      }),
    ).toBe(true);
  });

  it("records runtime document changes", () => {
    expect(
      shouldRecordEvaluationTransaction({
        docChanged: true,
        selectionChanged: false,
        remote: true,
      }),
    ).toBe(true);
  });

  it("skips runtime transactions that do not change the document", () => {
    expect(
      shouldRecordEvaluationTransaction({
        docChanged: false,
        selectionChanged: true,
        remote: true,
      }),
    ).toBe(false);
  });

  it("skips local transactions that do not change the document or selection", () => {
    expect(
      shouldRecordEvaluationTransaction({
        docChanged: false,
        selectionChanged: false,
        remote: undefined,
      }),
    ).toBe(false);
  });
});
