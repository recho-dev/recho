"use client";

import {cn} from "../../cn.js";
import {susItems, susScaleLabels, nasaTlxDimensions} from "../questionnaire-data.ts";

export function QuestionnaireResults({questionnaire}) {
  if (!questionnaire) {
    return (
      <div className={cn("border border-gray-200 rounded-lg px-4 py-5 text-sm text-gray-500")}>
        No questionnaire was submitted for this session.
      </div>
    );
  }

  return (
    <div className={cn("space-y-6")}>
      <div>
        <h2 className={cn("text-lg font-semibold mb-4")}>Questionnaire Results</h2>

        <div className={cn("mb-6")}>
          <h3 className={cn("font-medium mb-1")}>
            System Usability Scale (SUS)
            <span className={cn("ml-2 text-blue-600 font-bold")}>Score: {questionnaire.sus.score}</span>
          </h3>

          <div className={cn("border border-gray-200 rounded-lg overflow-hidden text-sm")}>
            <div
              className={cn(
                "grid items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium",
              )}
              style={{gridTemplateColumns: "1fr repeat(5, 48px)"}}
            >
              <div />
              {susScaleLabels.map((label, i) => (
                <div key={label} className={cn("text-center")}>
                  {i + 1}
                </div>
              ))}
            </div>
            {susItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "grid items-center gap-2 px-4 py-2 border-b border-gray-100 last:border-b-0",
                  index % 2 === 1 && "bg-gray-50/50",
                )}
                style={{gridTemplateColumns: "1fr repeat(5, 48px)"}}
              >
                <div className={cn("text-sm")}>
                  <span className={cn("text-gray-400 mr-2")}>{item.id}.</span>
                  {item.text}
                </div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <div key={value} className={cn("flex justify-center")}>
                    {questionnaire.sus.items[index] === value ? (
                      <span className={cn("w-4 h-4 rounded-full bg-blue-600 block")} />
                    ) : (
                      <span className={cn("w-4 h-4 rounded-full border border-gray-300 block")} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className={cn("font-medium mb-3")}>NASA Task Load Index</h3>
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4")}>
            {nasaTlxDimensions.map((dim) => {
              const value = questionnaire.nasaTlx[dim.id];
              return (
                <div key={dim.id} className={cn("border border-gray-200 rounded-lg p-3")}>
                  <div className={cn("flex items-baseline justify-between mb-1")}>
                    <span className={cn("text-sm font-medium")}>{dim.label}</span>
                    <span className={cn("text-sm font-mono text-blue-600")}>{value}</span>
                  </div>
                  <div className={cn("w-full bg-gray-200 rounded-full h-2")}>
                    <div className={cn("bg-blue-600 h-2 rounded-full")} style={{width: `${value}%`}} />
                  </div>
                  <div className={cn("flex justify-between text-xs text-gray-400 mt-1")}>
                    <span>{dim.lowAnchor}</span>
                    <span>{dim.highAnchor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
