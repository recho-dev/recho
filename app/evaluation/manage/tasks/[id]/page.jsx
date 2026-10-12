"use client";

import {useState, useCallback, useEffect, useRef} from "react";
import {useParams, useRouter, notFound} from "next/navigation";
import {Panel, PanelGroup, PanelResizeHandle} from "react-resizable-panels";
import {ArrowLeft, Save, Play, Circle, Loader2, AlertCircle, Check, Pencil, Trash2, X} from "lucide-react";
import {cn} from "../../../../cn.js";
import {getTaskById, updateTaskCode, renameTask, deleteTask, loadTasks} from "../../../tasks.ts";
import {Editor} from "../../../../Editor.jsx";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState(() => getTaskById(params.id));
  const [loading, setLoading] = useState(!task);
  const [taskNotFound, setTaskNotFound] = useState(false);

  useEffect(() => {
    if (task) return; // already have it from cache
    let cancelled = false;
    setLoading(true);
    loadTasks()
      .then(() => {
        if (cancelled) return;
        const loaded = getTaskById(params.id);
        if (loaded) {
          setTask(loaded);
          setTemplateCode(loaded.code);
          setSavedCode(loaded.code);
          setDryRunCode(loaded.code);
        } else {
          setTaskNotFound(true);
        }
      })
      .catch(() => {
        if (!cancelled) setTaskNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // State for the template editor (left pane)
  const [templateCode, setTemplateCode] = useState(() => task?.code ?? "");
  const [savedCode, setSavedCode] = useState(() => task?.code ?? "");
  const isDirty = templateCode !== savedCode;

  // State for the dry-run editor (right pane)
  const [dryRunCode, setDryRunCode] = useState(() => task?.code ?? "");
  const [dryRunKey, setDryRunKey] = useState(0);

  // Save status feedback
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const saveTimerRef = useRef(null);

  // Ref to track latest templateCode for the keyboard shortcut handler
  const templateCodeRef = useRef(templateCode);
  templateCodeRef.current = templateCode;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const handleSave = useCallback(async () => {
    if (!task) return;
    const code = templateCodeRef.current;
    setSaveStatus("saving");
    clearTimeout(saveTimerRef.current);
    const ok = await updateTaskCode(task.id, code);
    if (ok) {
      setSavedCode(code);
      setSaveStatus("saved");
      saveTimerRef.current = setTimeout(() => setSaveStatus(null), 2000);
    } else {
      setSaveStatus("error");
      saveTimerRef.current = setTimeout(() => setSaveStatus(null), 4000);
    }
  }, [task]);

  const handleStartDryRun = useCallback(() => {
    setDryRunCode(templateCodeRef.current);
    setDryRunKey((prev) => prev + 1);
  }, []);

  // Intercept Cmd/Ctrl+S at the capture phase so it saves the template
  // instead of falling through to the Editor's built-in run-on-save.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (isDirtyRef.current) handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown, {capture: true});
    return () => window.removeEventListener("keydown", onKeyDown, {capture: true});
  }, [handleSave]);

  useEffect(() => {
    if (task) document.title = `Task ${task.id}: ${task.title} | Recho Notebook`;
  }, [task]);

  // Rename state
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  const handleStartRename = useCallback(() => {
    if (!task) return;
    setRenameValue(task.title);
    setRenaming(true);
    // Focus the input after React renders it
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }, [task]);

  const handleConfirmRename = useCallback(async () => {
    if (!task || !renameValue.trim() || renameValue.trim() === task.title) {
      setRenaming(false);
      return;
    }
    const ok = await renameTask(task.id, renameValue.trim());
    if (ok) {
      setTask({...task, title: renameValue.trim()});
    }
    setRenaming(false);
  }, [task, renameValue]);

  // Delete state
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!task) return;
    setDeleting(true);
    const ok = await deleteTask(task.id);
    if (ok) {
      router.push("/evaluation/manage/tasks");
    } else {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }, [task, router]);

  // Clean up save timer on unmount
  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  if (taskNotFound) return notFound();

  if (loading || !task) {
    return (
      <div className={cn("flex items-center justify-center h-[calc(100vh-65px)] text-gray-500")}>
        <Loader2 className={cn("w-5 h-5 animate-spin mr-2")} />
        Loading task…
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-[calc(100vh-65px)]")}>
      {/* Header */}
      <div className={cn("flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white shrink-0")}>
        <button
          onClick={() => router.push("/evaluation/manage/tasks")}
          className={cn("flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800")}
        >
          <ArrowLeft className={cn("w-4 h-4")} />
          Tasks
        </button>
        <div className={cn("h-4 w-px bg-gray-300")} />
        <span className={cn("rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700")}>
          Task {task.id}
        </span>

        {/* Inline rename */}
        {renaming ? (
          <form
            className={cn("flex items-center gap-1.5")}
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmRename();
            }}
          >
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleConfirmRename}
              onKeyDown={(e) => {
                if (e.key === "Escape") setRenaming(false);
              }}
              className={cn(
                "border border-gray-300 rounded px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500",
              )}
            />
          </form>
        ) : (
          <button
            onClick={handleStartRename}
            className={cn("flex items-center gap-1.5 text-sm font-semibold hover:text-blue-600 group")}
            title="Click to rename"
          >
            {task.title}
            <Pencil className={cn("w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity")} />
          </button>
        )}

        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            task.difficulty === "easy"
              ? "bg-emerald-50 text-emerald-700"
              : task.difficulty === "medium"
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700",
          )}
        >
          {task.difficulty}
        </span>

        {/* Spacer */}
        <div className={cn("flex-1")} />

        {/* Delete */}
        {confirmingDelete ? (
          <div className={cn("flex items-center gap-2")}>
            <span className={cn("text-sm text-red-600")}>Delete this task?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={cn(
                "flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors",
              )}
            >
              {deleting ? (
                <Loader2 className={cn("w-3.5 h-3.5 animate-spin")} />
              ) : (
                <Trash2 className={cn("w-3.5 h-3.5")} />
              )}
              {deleting ? "Deleting…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className={cn(
                "flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
              )}
            >
              <X className={cn("w-3.5 h-3.5")} />
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors",
            )}
          >
            <Trash2 className={cn("w-3.5 h-3.5")} />
            Delete
          </button>
        )}
      </div>

      {/* Split pane */}
      <PanelGroup direction="horizontal" className={cn("flex-1 min-h-0")}>
        {/* Left: Template editor */}
        <Panel defaultSize={50} minSize={30}>
          <div className={cn("flex flex-col h-full")}>
            <div
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0",
              )}
            >
              <div className={cn("flex items-center gap-2")}>
                <span className={cn("text-sm font-medium")}>Template</span>
                {isDirty && (
                  <span className={cn("flex items-center gap-1 text-xs text-amber-600")}>
                    <Circle className={cn("w-2 h-2 fill-amber-500 stroke-amber-500")} />
                    Unsaved
                  </span>
                )}
              </div>
              <div className={cn("flex items-center gap-2")}>
                {saveStatus === "saved" && (
                  <span className={cn("flex items-center gap-1 text-xs text-emerald-600")}>
                    <Check className={cn("w-3 h-3")} />
                    Saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className={cn("flex items-center gap-1 text-xs text-red-600")}>
                    <AlertCircle className={cn("w-3 h-3")} />
                    Save failed
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={!isDirty && saveStatus !== "error"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isDirty || saveStatus === "error"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed",
                  )}
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className={cn("w-3.5 h-3.5 animate-spin")} />
                  ) : (
                    <Save className={cn("w-3.5 h-3.5")} />
                  )}
                  {saveStatus === "saving" ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            <div className={cn("flex-1 min-h-0 overflow-auto")}>
              <Editor initialCode={task.code} onUserInput={setTemplateCode} autoRun={false} pinToolbar={true} />
            </div>
          </div>
        </Panel>

        {/* Resize handle */}
        <PanelResizeHandle
          className={cn(
            "w-2 bg-gray-100 border-x border-gray-200 hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center",
          )}
        >
          <div className={cn("flex flex-col gap-1")}>
            <div className={cn("w-0.5 h-1 rounded-full bg-gray-400")} />
            <div className={cn("w-0.5 h-1 rounded-full bg-gray-400")} />
            <div className={cn("w-0.5 h-1 rounded-full bg-gray-400")} />
          </div>
        </PanelResizeHandle>

        {/* Right: Dry-run editor */}
        <Panel defaultSize={50} minSize={30}>
          <div className={cn("flex flex-col h-full")}>
            <div
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0",
              )}
            >
              <span className={cn("text-sm font-medium")}>Dry Run</span>
              <button
                onClick={handleStartDryRun}
                className={cn(
                  "flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 transition-colors",
                )}
              >
                <Play className={cn("w-3.5 h-3.5")} />
                Start
              </button>
            </div>
            <div className={cn("flex-1 min-h-0 overflow-auto")}>
              <Editor key={dryRunKey} initialCode={dryRunCode} autoRun={dryRunKey > 0} pinToolbar={true} />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
