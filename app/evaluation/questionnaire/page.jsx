"use client";

import {useState, useSyncExternalStore, useEffect} from "react";
import {useRouter} from "next/navigation";
import {cn} from "../../cn.js";
import {evaluationStore} from "../store.ts";
import {susItems, susScaleLabels, computeSUSScore, nasaTlxDimensions} from "../questionnaire-data.ts";

export default function QuestionnairePage() {
  const router = useRouter();
  const evalState = useSyncExternalStore(
    evaluationStore.subscribe,
    evaluationStore.getSnapshot,
    evaluationStore.getServerSnapshot,
  );

  // SUS state: array of 10, each null (unanswered) or 1-5
  const [susAnswers, setSusAnswers] = useState(() => Array(10).fill(null));

  // NASA-TLX state: 6 dimensions, default 50
  const [tlxAnswers, setTlxAnswers] = useState(() => {
    const defaults = {};
    for (const dim of nasaTlxDimensions) {
      defaults[dim.id] = 50;
    }
    return defaults;
  });

  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Guard: redirect if no active evaluation
  useEffect(() => {
    if (!evalState.active) {
      router.replace("/");
    }
  }, [evalState.active, router]);

  if (!evalState.active) {
    return null;
  }

  function handleSusChange(index, value) {
    setSusAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setValidationError("");
  }

  function handleTlxChange(dimensionId, value) {
    setTlxAnswers((prev) => ({...prev, [dimensionId]: value}));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate SUS: all items must be answered
    const unanswered = susAnswers.findIndex((a) => a === null);
    if (unanswered !== -1) {
      setValidationError(`Please answer SUS item ${unanswered + 1}.`);
      return;
    }

    setSubmitting(true);

    const susScore = computeSUSScore(susAnswers);

    const response = {
      sus: {
        items: susAnswers,
        score: susScore,
      },
      nasaTlx: {
        mentalDemand: tlxAnswers.mentalDemand,
        physicalDemand: tlxAnswers.physicalDemand,
        temporalDemand: tlxAnswers.temporalDemand,
        performance: tlxAnswers.performance,
        effort: tlxAnswers.effort,
        frustration: tlxAnswers.frustration,
      },
      submittedAt: Date.now(),
    };

    const submitted = await evaluationStore.submitQuestionnaire(response);
    if (submitted) {
      router.push("/evaluation/questionnaire/complete");
    } else {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("max-w-screen-md mx-auto px-4 py-8")}>
      <h1 className={cn("text-2xl font-bold mb-1")}>Post-Study Questionnaire</h1>
      <p className={cn("text-sm text-gray-500 mb-8")}>
        Participant: {evalState.participantName} (P#{evalState.participantId}){" \u00b7 "}
        {evalState.completedTasks.length} task{evalState.completedTasks.length !== 1 ? "s" : ""} completed
      </p>

      <form onSubmit={handleSubmit}>
        {/* SUS Section */}
        <section className={cn("mb-10")}>
          <h2 className={cn("text-lg font-semibold mb-1")}>System Usability Scale (SUS)</h2>
          <p className={cn("text-sm text-gray-500 mb-4")}>
            Please rate each statement on a scale from Strongly Disagree to Strongly Agree.
          </p>

          <div className={cn("border border-gray-200 rounded-lg overflow-hidden")}>
            {/* Header row */}
            <div
              className={cn(
                "grid items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium",
              )}
              style={{gridTemplateColumns: "1fr repeat(5, 64px)"}}
            >
              <div />
              {susScaleLabels.map((label) => (
                <div key={label} className={cn("text-center leading-tight")}>
                  {label}
                </div>
              ))}
            </div>

            {/* Items */}
            {susItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "grid items-center gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0",
                  index % 2 === 1 && "bg-gray-50/50",
                )}
                style={{gridTemplateColumns: "1fr repeat(5, 64px)"}}
              >
                <div className={cn("text-sm")}>
                  <span className={cn("text-gray-400 mr-2")}>{item.id}.</span>
                  {item.text}
                </div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <div key={value} className={cn("flex justify-center")}>
                    <input
                      type="radio"
                      name={`sus-${item.id}`}
                      value={value}
                      checked={susAnswers[index] === value}
                      onChange={() => handleSusChange(index, value)}
                      className={cn("w-4 h-4 cursor-pointer accent-blue-600")}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* NASA-TLX Section */}
        <section className={cn("mb-10")}>
          <h2 className={cn("text-lg font-semibold mb-1")}>NASA Task Load Index (NASA-TLX)</h2>
          <p className={cn("text-sm text-gray-500 mb-4")}>Rate each dimension of workload on a scale from 0 to 100.</p>

          <div className={cn("space-y-6")}>
            {nasaTlxDimensions.map((dim) => (
              <div key={dim.id} className={cn("border border-gray-200 rounded-lg p-4")}>
                <div className={cn("flex items-baseline justify-between mb-1")}>
                  <h3 className={cn("font-medium text-sm")}>{dim.label}</h3>
                  <span className={cn("text-sm font-mono text-blue-600")}>{tlxAnswers[dim.id]}</span>
                </div>
                <p className={cn("text-xs text-gray-500 mb-3")}>{dim.description}</p>
                <div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={tlxAnswers[dim.id]}
                    onChange={(e) => handleTlxChange(dim.id, Number(e.target.value))}
                    className={cn("w-full accent-blue-600")}
                  />
                  <div className={cn("flex justify-between text-xs text-gray-400 mt-1")}>
                    <span>{dim.lowAnchor}</span>
                    <span>{dim.highAnchor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Validation error */}
        {validationError && (
          <div className={cn("bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4")}>
            <p className={cn("text-red-700 font-medium")}>{validationError}</p>
          </div>
        )}

        {/* Submit */}
        <div className={cn("flex justify-end")}>
          <button
            type="submit"
            disabled={submitting || susAnswers.some((a) => a === null)}
            className={cn(
              "px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? "Submitting..." : "Submit & Finish"}
          </button>
        </div>
      </form>
    </div>
  );
}
