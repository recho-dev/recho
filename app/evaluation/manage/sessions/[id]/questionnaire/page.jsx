"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {notFound, useParams} from "next/navigation";
import {cn} from "../../../../../cn.js";
import {QuestionnaireResults} from "../../../QuestionnaireResults.jsx";

export default function EvaluationQuestionnairePage() {
  const params = useParams();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluation() {
      try {
        const res = await fetch(`/api/evaluations/${params.id}`);

        if (res.status === 404) {
          if (!cancelled) {
            setMissing(true);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load evaluation (${res.status})`);
        }

        const data = await res.json();
        if (cancelled) return;

        setEvaluation(data);
        setLoading(false);
        document.title = `P#${data.participantId} Questionnaire | Evaluation`;
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load evaluation questionnaire:", error);
        setLoading(false);
      }
    }

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className={cn("max-w-screen-xl mx-auto px-4 py-8")}>
        <p className={cn("text-gray-500")}>Loading questionnaire...</p>
      </div>
    );
  }

  if (missing) {
    notFound();
  }

  if (!evaluation) {
    return (
      <div className={cn("max-w-screen-xl mx-auto px-4 py-8")}>
        <p className={cn("text-red-500")}>Evaluation not found.</p>
      </div>
    );
  }

  return (
    <div className={cn("max-w-screen-xl mx-auto px-4 py-8")}>
      <div className={cn("flex items-start justify-between gap-4 mb-8")}>
        <div>
          <h1 className={cn("text-2xl font-bold mb-1")}>
            {evaluation.participantName || "(unnamed)"} (P#{evaluation.participantId})
          </h1>
          <p className={cn("text-sm text-gray-500")}>Questionnaire results</p>
          <p className={cn("text-xs text-gray-400 mt-1 font-mono")}>{evaluation.id}</p>
        </div>
        <Link
          href={`/evaluation/manage/sessions/${evaluation.id}`}
          className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
        >
          Back to Replay
        </Link>
      </div>

      <QuestionnaireResults questionnaire={evaluation.questionnaire} />
    </div>
  );
}
