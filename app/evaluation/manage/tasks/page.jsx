"use client";

import {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {ChevronRight} from "lucide-react";
import {cn} from "../../../cn.js";
import {getTasks, loadTasks} from "../../tasks.ts";

function sortTagCounts(tagCounts) {
  return [...tagCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default function TaskLibraryPage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState([]);
  const [tasks, setTasks] = useState(getTasks());

  useEffect(() => {
    loadTasks().then((loaded) => setTasks(loaded));
  }, []);

  const tagCounts = useMemo(() => {
    const counts = new Map();
    for (const task of tasks) {
      for (const tag of task.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return sortTagCounts(counts);
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (selectedTags.length === 0) {
      return tasks;
    }
    return tasks.filter((task) => selectedTags.every((tag) => task.tags.includes(tag)));
  }, [selectedTags, tasks]);

  function toggleTag(tag) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  return (
    <div className={cn("max-w-screen-xl mx-auto px-4 py-8")}>
      <div className={cn("flex items-start justify-between gap-4 mb-8")}>
        <div>
          <h1 className={cn("text-2xl font-bold")}>Evaluation Task Library</h1>
          <p className={cn("text-sm text-gray-500 mt-1 max-w-3xl")}>
            All active study tasks live here. Tags describe the features and concepts inside each scaffold so the task
            set is easier to audit and rebalance before a user study.
          </p>
        </div>
        <button
          onClick={() => router.push("/evaluation/manage/sessions")}
          className={cn("px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100")}
        >
          Back to Sessions
        </button>
      </div>

      <div className={cn("grid gap-4 md:grid-cols-3 mb-8")}>
        <div className={cn("rounded-lg border border-gray-200 bg-white p-4")}>
          <p className={cn("text-xs font-medium uppercase tracking-wide text-gray-400")}>Tasks</p>
          <p className={cn("text-2xl font-semibold mt-1")}>{tasks.length}</p>
        </div>
        <div className={cn("rounded-lg border border-gray-200 bg-white p-4")}>
          <p className={cn("text-xs font-medium uppercase tracking-wide text-gray-400")}>Series</p>
          <p className={cn("text-2xl font-semibold mt-1")}>{new Set(tasks.map((task) => task.series)).size}</p>
        </div>
        <div className={cn("rounded-lg border border-gray-200 bg-white p-4")}>
          <p className={cn("text-xs font-medium uppercase tracking-wide text-gray-400")}>Feature Tags</p>
          <p className={cn("text-2xl font-semibold mt-1")}>{tagCounts.length}</p>
        </div>
      </div>

      <section className={cn("mb-8 rounded-lg border border-gray-200 bg-white p-4")}>
        <div className={cn("flex items-center justify-between gap-4 mb-3")}>
          <div>
            <h2 className={cn("text-lg font-semibold")}>Feature Tags</h2>
            <p className={cn("text-sm text-gray-500 mt-1")}>Click one or more tags to filter the task library.</p>
          </div>
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className={cn("text-sm text-blue-600 hover:text-blue-700")}>
              Clear filters
            </button>
          )}
        </div>
        <div className={cn("flex flex-wrap gap-2")}>
          {tagCounts.map(([tag, count]) => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                <span>{tag}</span>
                <span className={cn("text-xs text-gray-400")}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={cn("mb-4 flex items-center justify-between gap-4")}>
        <h2 className={cn("text-lg font-semibold")}>Tasks</h2>
        <p className={cn("text-sm text-gray-500")}>
          Showing {visibleTasks.length} of {tasks.length}
        </p>
      </div>

      <div className={cn("space-y-4")}>
        {visibleTasks.map((task) => (
          <section
            key={task.id}
            onClick={() => router.push(`/evaluation/manage/tasks/${task.id}`)}
            className={cn(
              "rounded-xl border border-gray-200 bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all",
            )}
          >
            <div className={cn("flex items-start gap-4")}>
              <div className={cn("flex-1 min-w-0")}>
                <div className={cn("flex flex-wrap items-center gap-2 text-sm text-gray-500")}>
                  <span className={cn("rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700")}>
                    Task {task.id}
                  </span>
                  <span>{task.series}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      task.difficulty === "easy"
                        ? "bg-emerald-50 text-emerald-700"
                        : task.difficulty === "medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700",
                    )}
                  >
                    {task.difficulty}
                  </span>
                </div>
                <h3 className={cn("text-lg font-semibold mt-2")}>{task.title}</h3>
                <p className={cn("text-sm text-gray-600 mt-1 max-w-3xl")}>{task.summary}</p>
                <div className={cn("flex flex-wrap gap-1.5 mt-3")}>
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className={cn("w-5 h-5 text-gray-400 shrink-0 mt-1")} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
