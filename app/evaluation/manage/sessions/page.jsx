"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {cn} from "../../../cn.js";

export default function ManagePage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Evaluation Management | Recho Notebook";
    fetch("/api/evaluations")
      .then((res) => res.json())
      .then((data) => {
        setEvaluations(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load evaluations:", e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
        <p className={cn("text-gray-500")}>Loading evaluations...</p>
      </div>
    );
  }

  return (
    <div className={cn("max-w-screen-lg mx-auto px-4 py-8")}>
      <div className={cn("flex items-center justify-between gap-4 mb-6")}>
        <div>
          <h1 className={cn("text-2xl font-bold")}>Evaluation Management</h1>
          <p className={cn("text-sm text-gray-500 mt-1")}>Browse study sessions or inspect the current task library.</p>
        </div>
        <button
          onClick={() => router.push("/evaluation/manage/tasks")}
          className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
        >
          Task Library
        </button>
      </div>

      {evaluations.length === 0 ? (
        <p className={cn("text-gray-500")}>No evaluations found.</p>
      ) : (
        <div className={cn("border border-gray-200 rounded-lg overflow-hidden")}>
          <table className={cn("w-full text-sm")}>
            <thead>
              <tr className={cn("bg-gray-50 border-b border-gray-200")}>
                <th className={cn("text-left px-4 py-3 font-medium text-gray-500")}>Participant</th>
                <th className={cn("text-left px-4 py-3 font-medium text-gray-500")}>ID</th>
                <th className={cn("text-left px-4 py-3 font-medium text-gray-500")}>Date</th>
                <th className={cn("text-left px-4 py-3 font-medium text-gray-500")}>Tasks</th>
                <th className={cn("text-left px-4 py-3 font-medium text-gray-500")}>Questionnaire</th>
                <th className={cn("text-left px-4 py-3 font-medium text-gray-500")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr
                  key={ev.id}
                  onClick={() => router.push(`/evaluation/manage/sessions/${ev.id}`)}
                  className={cn(
                    "border-b border-gray-100 last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors",
                  )}
                >
                  <td className={cn("px-4 py-3 font-medium")}>{ev.participantName || "(unnamed)"}</td>
                  <td className={cn("px-4 py-3 text-gray-500")}>P#{ev.participantId}</td>
                  <td className={cn("px-4 py-3 text-gray-500")}>{new Date(ev.sessionStartTime).toLocaleString()}</td>
                  <td className={cn("px-4 py-3")}>{ev.taskCount}</td>
                  <td className={cn("px-4 py-3")}>
                    {ev.hasQuestionnaire ? (
                      <span className={cn("text-green-600")}>Yes</span>
                    ) : (
                      <span className={cn("text-gray-400")}>No</span>
                    )}
                  </td>
                  <td className={cn("px-4 py-3")}>
                    {ev.sessionEndTime ? (
                      <span className={cn("bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full")}>
                        Complete
                      </span>
                    ) : (
                      <span className={cn("bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full")}>
                        In Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
