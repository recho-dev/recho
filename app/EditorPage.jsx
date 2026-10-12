"use client";
import {useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore} from "react";
import {notFound, useRouter} from "next/navigation";
import {ViewPlugin} from "@codemirror/view";
import {Pencil, Grid2X2} from "lucide-react";
import {Editor} from "./Editor.jsx";
import {CharacterPicker} from "./character-picker/CharacterPicker.jsx";
import {getNotebookById, createNotebook, addNotebook, saveNotebook, getNotebooks, duplicateNotebook} from "./api.js";
import {isDirtyStore, countStore} from "./store.js";
import {cn} from "./cn.js";
import {SafeLink} from "./SafeLink.jsx";
import {BASE_PATH} from "./shared.js";
import {evaluationStore} from "./evaluation/store.ts";
import {getTaskById} from "./evaluation/tasks.ts";
import {createInstrumentationExtension} from "./evaluation/instrumentation.ts";
import {TaskCompleteDialog} from "./evaluation/TaskCompleteDialog.tsx";

const UNSET = Symbol("UNSET");

function isPrimarySaveShortcut(event) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
}

export function EditorPage({id: initialId}) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(UNSET);
  const [notebookList, setNotebookList] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [id, setId] = useState(initialId);
  const [initialCode, setInitialCode] = useState(null);
  const [editorSeedTaskClientId, setEditorSeedTaskClientId] = useState(null);
  const [title, setTitle] = useState("");
  const titleRef = useRef(null);
  const count = useSyncExternalStore(countStore.subscribe, countStore.getSnapshot, countStore.getServerSnapshot);
  const isDirty = useSyncExternalStore(
    isDirtyStore.subscribe,
    isDirtyStore.getSnapshot,
    isDirtyStore.getServerSnapshot,
  );
  const evalState = useSyncExternalStore(
    evaluationStore.subscribe,
    evaluationStore.getSnapshot,
    evaluationStore.getServerSnapshot,
  );
  const prevCount = useRef(id ? count : null); // Last saved count.
  const isAdded = prevCount.current === count; // Whether the notebook is added to the storage.
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [completionMode, setCompletionMode] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("recho-completion-mode") || "enter";
    }
    return "enter";
  });
  const timer = useRef(null);
  const viewRef = useRef(null);
  const notebookRef = useRef(notebook);
  notebookRef.current = notebook;

  // ViewPlugin to capture the EditorView reference for character insertion
  const viewCapturePlugin = useMemo(
    () =>
      ViewPlugin.fromClass(
        class {
          constructor(view) {
            viewRef.current = view;
          }
          destroy() {
            viewRef.current = null;
          }
        },
      ),
    [],
  );

  const handleInsertChar = useCallback((char) => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(view.state.replaceSelection(char));
    view.focus();
  }, []);

  const activeTask = evalState.currentTaskId ? getTaskById(evalState.currentTaskId) : null;
  const editorInstanceKey =
    evalState.active && evalState.currentTaskClientId ? `task-${evalState.currentTaskClientId}` : notebook?.id;
  const taskEditorReady =
    !evalState.active || !evalState.currentTaskId || editorSeedTaskClientId === evalState.currentTaskClientId;

  // Create instrumentation extension for evaluation recording
  const instrumentationExt = useMemo(() => {
    if (!evalState.active || !evalState.currentTaskId) return null;
    const nextIndex =
      evalState.currentTransactions.reduce((maxIndex, record) => Math.max(maxIndex, record.index), -1) + 1;

    return createInstrumentationExtension(
      (record) => {
        evaluationStore.recordTransaction(record);
      },
      {
        captureInitialState: evalState.currentTransactions.length === 0,
        startIndex: nextIndex,
        startTimeMs: evalState.currentTaskStartTime ?? undefined,
      },
    );
  }, [evalState.active, evalState.currentTaskId, evalState.currentTaskStartTime, evalState.currentTransactions]);

  const onSave = useCallback(() => {
    // During evaluation, don't save to localStorage — the notebook is ephemeral.
    if (evalState.active) return;
    isDirtyStore.setDirty(false);
    if (isAdded) {
      saveNotebook(notebook);
    } else {
      addNotebook(notebook);
      prevCount.current = count;
      const id = notebook.id;
      setId(id); // Force re-render.
      window.history.pushState(null, "", `${BASE_PATH}/works/${id}`); // Just update the url, no need to reload the page.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebook, evalState.active]);

  // This effect is triggered when the count changes,
  // which happens when user clicks the "New" nav link.
  useEffect(() => {
    const initialNotebook = isAdded ? getNotebookById(id) : createNotebook();
    setNotebook(initialNotebook);
    setInitialCode(initialNotebook.content);
    setEditorSeedTaskClientId(null);
    setAutoRun(initialNotebook.autoRun);
    setTitle(initialNotebook.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Handle evaluation task loading.
  // Use evalState.currentCode (if available) to restore editor content after
  // navigating away (e.g. to docs) and back. This prevents loss of user edits.
  useEffect(() => {
    if (!evalState.active || !evalState.currentTaskId) return;
    const task = getTaskById(evalState.currentTaskId);
    if (!task) return;

    // If the store has saved code (e.g. user navigated to docs and back),
    // restore it instead of resetting to the task's starter code.
    const code = evalState.currentCode ?? task.code;

    const evalNotebook = {
      ...createNotebook(),
      title: `Task ${task.id}: ${task.title}`,
      content: code,
      autoRun: false,
    };
    setNotebook(evalNotebook);
    setInitialCode(code);
    setEditorSeedTaskClientId(evalState.currentTaskClientId);
    setAutoRun(false);
    setTitle(evalNotebook.title);
  }, [evalState.active, evalState.currentTaskId, evalState.currentTaskClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Use setTimeout to avoid changing to default title.
    setTimeout(() => {
      document.title = `${isAdded ? notebook.title : "New"} | Recho Notebook`;
    }, 100);
  }, [notebook, isAdded]);

  useEffect(() => {
    const notebooks = getNotebooks();
    setNotebookList(notebooks.slice(0, 4));
  }, [isAdded]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isPrimarySaveShortcut(e)) {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown, {capture: true});
    return () => window.removeEventListener("keydown", onKeyDown, {capture: true});
  }, [onSave]);

  useEffect(() => {
    if (showInput) titleRef.current.focus();
  }, [showInput]);

  if (notebook === UNSET) return <div className={cn("max-w-screen-lg mx-auto my-10 editor-page")}>Loading...</div>;

  if (!notebook) return notFound();

  function onUserInput(code) {
    const newNotebook = {...notebook, content: code};
    if (evalState.active) {
      // During evaluation, just update local state without saving to localStorage.
      // Also persist to evaluation store so code survives navigation (e.g. to docs).
      setNotebook(newNotebook);
      evaluationStore.updateCurrentCode(code);
    } else if (isAdded) {
      saveNotebook(newNotebook);
      setNotebook(newNotebook);
    } else {
      setNotebook(newNotebook);
      isDirtyStore.setDirty(true);
    }
  }

  function onRename() {
    setShowInput(true);
    setTitle(notebook.title);
  }

  // Only submit rename when blur with valid title.
  function onTitleBlur() {
    setShowInput(false);
    // The title can't be empty.
    if (!title) return setTitle(notebook.title);
    const newNotebook = {...notebook, title};
    setNotebook(newNotebook);
    if (isAdded) saveNotebook(newNotebook);
    else isDirtyStore.setDirty(true);
  }

  function onTitleChange(e) {
    setTitle(e.target.value);
  }

  function onTitleKeyDown(e) {
    if (e.key === "Enter") {
      onTitleBlur();
      titleRef.current.blur();
    }
  }

  // If long-running code is detected, set autoRun to false
  // to prevent the browser from freezing on infinite loops
  // and can't continue to edit the code.
  function onBeforeEachRun() {
    if (!isAdded) return;
    if (timer.current) clearTimeout(timer.current);
    const newNotebook = {...notebook, autoRun: false};
    saveNotebook(newNotebook);
    timer.current = setTimeout(() => {
      const newNotebook = {...notebook, autoRun: true};
      saveNotebook(newNotebook);
      timer.current = null;
    }, 100);
  }

  function onDuplicate() {
    const duplicated = duplicateNotebook(notebook);
    addNotebook(duplicated);
    router.push(`/works/${duplicated.id}`);
  }

  async function handleCompleteConfirm() {
    const finalCode = notebookRef.current?.content ?? "";
    await evaluationStore.completeCurrentTask(finalCode);
  }

  function handleCompleteCancel() {
    evaluationStore.closeCompleteDialog();
  }

  function toggleCompletionMode() {
    const next = completionMode === "enter" ? "tab" : "enter";
    setCompletionMode(next);
    try {
      localStorage.setItem("recho-completion-mode", next);
    } catch {}
  }

  // Build extensions array for the editor
  const editorExtensions = [viewCapturePlugin, ...(instrumentationExt ? [instrumentationExt] : [])];

  return (
    <div>
      {!evalState.active && !isAdded && notebookList.length > 0 && (
        <div className={cn("flex h-[72px] bg-gray-100 p-2 w-full border-b border-gray-200")}>
          <div
            className={cn(
              "flex items-center justify-between gap-2 h-full max-w-screen-lg lg:mx-auto mx-4 w-full hidden md:flex",
            )}
          >
            {notebookList.map((notebook) => (
              <div key={notebook.id} className={cn("flex items-start flex-col gap-1")}>
                <SafeLink
                  href={`/works/${notebook.id}`}
                  className={cn(
                    "font-semibold hover:underline text-blue-500 whitespace-nowrap line-clamp-1 max-w-[150px] text-ellipsis",
                  )}
                >
                  {notebook.title}
                </SafeLink>
                <span
                  className={cn("text-xs text-gray-500 line-clamp-1 whitespace-nowrap max-w-[150px] text-ellipsis")}
                >
                  Created {new Date(notebook.created).toLocaleDateString()}
                </span>
              </div>
            ))}
            <SafeLink href="/works" className={cn("font-semibold text-blue-500 hover:underline")}>
              View your notebooks
            </SafeLink>
          </div>
          <div
            className={cn(
              "flex items-center justify-between gap-2 h-full max-w-screen-lg lg:mx-auto mx-4 w-full md:hidden",
            )}
          >
            <SafeLink
              href="/works"
              className={cn(
                "font-medium w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-center hover:bg-gray-200",
              )}
            >
              View your notebooks
            </SafeLink>
          </div>
        </div>
      )}
      {!evalState.active && !isAdded && notebookList.length === 0 && (
        <div className={cn("flex items-center justify-center h-[72px] mt-6 mb-10 lg:mb-0")}>
          <p className={cn("text-3xl text-gray-800 font-light text-center mx-10")}>
            Explore code and art with instant feedback.
          </p>
        </div>
      )}
      <div
        className={cn(
          "lg:mx-auto mx-4 lg:my-10 my-4 editor-page",
          showCharPicker ? "max-w-screen-xl" : "max-w-screen-lg",
        )}
      >
        <div className={cn("flex gap-4 items-start")}>
          <div className="flex-1 min-w-0">
            {taskEditorReady ? (
              <Editor
                initialCode={initialCode}
                key={editorInstanceKey}
                onUserInput={onUserInput}
                onBeforeEachRun={onBeforeEachRun}
                autoRun={autoRun}
                onDuplicate={!evalState.active && isAdded ? onDuplicate : null}
                extensions={editorExtensions}
                completionMode={completionMode}
                toolBarStart={
                  <div className={cn("flex items-center gap-2")}>
                    {!evalState.active && !isAdded && (
                      <button
                        onClick={onSave}
                        className={cn("bg-green-700 text-white rounded-md px-3 py-1 text-sm hover:bg-green-800")}
                      >
                        Create
                      </button>
                    )}
                    {!evalState.active && !showInput && isAdded && (
                      <button onClick={onRename}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {!evalState.active && (showInput || !isAdded) ? (
                      <input
                        type="text"
                        value={title}
                        onChange={onTitleChange}
                        onBlur={onTitleBlur}
                        onKeyDown={onTitleKeyDown}
                        ref={titleRef}
                        className={cn("border border-gray-200 rounded-md px-3 py-1 text-sm bg-white")}
                      />
                    ) : !evalState.active ? (
                      <span className={cn("text-sm py-1 border border-gray-100 rounded-md")}>{notebook.title}</span>
                    ) : (
                      <span className={cn("text-sm py-1 font-medium")}>{title}</span>
                    )}
                    <button
                      onClick={() => setShowCharPicker((prev) => !prev)}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors",
                        showCharPicker && "bg-gray-200",
                      )}
                      title="Toggle Character Picker"
                    >
                      <Grid2X2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={toggleCompletionMode}
                      className={cn(
                        "h-7 flex items-center gap-1 rounded border border-gray-300 px-1.5 text-xs font-mono hover:bg-gray-200 transition-colors select-none",
                      )}
                      title={`Accept completions with ${completionMode === "enter" ? "Enter" : "Tab"}. Click to switch.`}
                    >
                      <span className={cn("text-gray-400")}>Accept:</span>
                      <span className={cn("font-semibold")}>{completionMode === "enter" ? "Enter ↵" : "Tab ⇥"}</span>
                    </button>
                  </div>
                }
              />
            ) : (
              <div className={cn("w-full border border-gray-200 rounded-md p-6 text-sm text-gray-500")}>
                Preparing task editor...
              </div>
            )}
          </div>
          {showCharPicker && (
            <div className="w-72 flex-shrink-0 hidden md:block">
              <CharacterPicker onInsert={handleInsertChar} />
            </div>
          )}
        </div>
      </div>

      {/* Task completion dialog */}
      <TaskCompleteDialog
        open={evalState.showCompleteDialog}
        onConfirm={handleCompleteConfirm}
        onCancel={handleCompleteCancel}
      />
    </div>
  );
}
