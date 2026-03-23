import type {EvaluationSession} from "./types.ts";

export function exportEvaluationData(session: EvaluationSession) {
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evaluation-${session.participantId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
