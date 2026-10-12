"use client";

import {cn} from "../../../cn.js";

export default function QuestionnaireCompletePage() {
  return (
    <div className={cn("max-w-screen-sm mx-auto px-4 py-16 text-center")}>
      <div className={cn("text-6xl mb-6")}>🎉</div>
      <h1 className={cn("text-3xl font-bold mb-4")}>Thank You!</h1>
      <p className={cn("text-lg text-gray-600 mb-6")}>
        You have completed all the tasks and the questionnaire. Great job — your responses have been recorded
        successfully.
      </p>
      <div className={cn("bg-blue-50 border border-blue-200 rounded-lg px-6 py-4 mb-8 text-left")}>
        <h2 className={cn("font-semibold text-blue-900 mb-2")}>What happens next?</h2>
        <ul className={cn("text-sm text-blue-800 space-y-2")}>
          <li>The researcher will now begin a short interview with you.</li>
          <li>You may stop your screen recording now if you have one running.</li>
        </ul>
      </div>
      <p className={cn("text-sm text-gray-400")}>You can close this tab or wait for the researcher to continue.</p>
    </div>
  );
}
