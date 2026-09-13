"use client";
import {useState, useEffect, useRef, useCallback, useSyncExternalStore} from "react";
import {notFound, useRouter} from "next/navigation";
import {Pencil} from "lucide-react";
import {Editor} from "./Editor.jsx";
import {
  getNotebookById,
  createNotebook,
  addNotebook,
  saveNotebook,
  saveNotebookDebounced,
  flushPendingSave,
  getNotebooks,
  duplicateNotebook,
  markRunning,
  clearRunning,
} from "./api.js";
import {isDirtyStore, countStore} from "./store.js";
import {authStore, ensureUser} from "./auth.js";
import {cn} from "./cn.js";
import {SafeLink} from "./SafeLink.jsx";
import {BASE_PATH} from "./shared.js";

const UNSET = Symbol("UNSET");

export function EditorPage({id: initialId}) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(UNSET);
  const [notebookList, setNotebookList] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [id, setId] = useState(initialId);
  const [initialCode, setInitialCode] = useState(null);
  const [title, setTitle] = useState("");
  const titleRef = useRef(null);
  const count = useSyncExternalStore(countStore.subscribe, countStore.getSnapshot, countStore.getServerSnapshot);
  const isDirty = useSyncExternalStore(
    isDirtyStore.subscribe,
    isDirtyStore.getSnapshot,
    isDirtyStore.getServerSnapshot,
  );
  const {user, loading: authLoading} = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  );
  const uid = user?.uid ?? null;
  const prevCount = useRef(id ? count : null); // Last saved count.
  const isAdded = prevCount.current === count; // Whether the notebook is added to the storage.
  const canSave = isAdded && !!user; // Local notebooks are read-only until the user logs in.
  const timer = useRef(null);

  const onSave = useCallback(async () => {
    // Saving requires logging in.
    if (!(await ensureUser())) return;
    try {
      if (isAdded) {
        await saveNotebook(notebook);
      } else {
        await addNotebook(notebook);
        prevCount.current = count;
        const id = notebook.id;
        setId(id); // Force re-render.
        window.history.pushState(null, "", `${BASE_PATH}/works/${id}`); // Just update the url, no need to reload the page.
      }
      isDirtyStore.setDirty(false);
    } catch (error) {
      console.error(error);
      alert(`Failed to save notebook: ${error.message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebook]);

  function loadNotebook(initialNotebook) {
    setNotebook(initialNotebook ?? null);
    if (!initialNotebook) return;
    setInitialCode(initialNotebook.content);
    setAutoRun(initialNotebook.autoRun);
    setTitle(initialNotebook.title);
  }

  // This effect is triggered when the count changes,
  // which happens when user clicks the "New" nav link.
  useEffect(() => {
    if (!isAdded) loadNotebook(createNotebook());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Load the saved notebook once auth is resolved, and again when the user changes.
  useEffect(() => {
    if (!isAdded || authLoading) return;
    let cancelled = false;
    getNotebookById(id)
      .then((initialNotebook) => !cancelled && loadNotebook(initialNotebook))
      .catch((error) => {
        console.error(error);
        if (!cancelled) loadNotebook(null);
      });
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, authLoading, uid]);

  // Save pending changes when leaving the page.
  useEffect(() => () => flushPendingSave(), []);

  useEffect(() => {
    // Use setTimeout to avoid changing to default title.
    setTimeout(() => {
      document.title = `${isAdded ? notebook.title : "New"} | Recho`;
    }, 100);
  }, [notebook, isAdded]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    getNotebooks()
      .then((notebooks) => !cancelled && setNotebookList(notebooks.slice(0, 4)))
      .catch((error) => console.error(error));
    return () => (cancelled = true);
  }, [isAdded, authLoading, uid]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.metaKey && e.key === "s") onSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave]);

  useEffect(() => {
    if (showInput) titleRef.current.focus();
  }, [showInput]);

  if (notebook === UNSET) return <div className={cn("max-w-screen-lg mx-auto my-10 editor-page")}>Loading...</div>;

  if (!notebook) return notFound();

  function onUserInput(code) {
    const newNotebook = {...notebook, content: code};
    setNotebook(newNotebook);
    if (canSave) saveNotebookDebounced(newNotebook);
    else isDirtyStore.setDirty(true);
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
    if (canSave) saveNotebookDebounced(newNotebook);
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

  // If long-running code is detected, disable auto run next time
  // to prevent the browser from freezing on infinite loops
  // and can't continue to edit the code.
  function onBeforeEachRun() {
    if (!isAdded) return;
    if (timer.current) clearTimeout(timer.current);
    markRunning(notebook.id);
    timer.current = setTimeout(() => {
      clearRunning(notebook.id);
      timer.current = null;
    }, 100);
  }

  async function onDuplicate() {
    if (!(await ensureUser())) return;
    const duplicated = duplicateNotebook(notebook);
    try {
      await addNotebook(duplicated);
      router.push(`/works/${duplicated.id}`);
    } catch (error) {
      console.error(error);
      alert(`Failed to duplicate notebook: ${error.message}`);
    }
  }

  return (
    <div>
      {!isAdded && notebookList.length > 0 && (
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
      {!isAdded && notebookList.length === 0 && (
        <div className={cn("flex items-center justify-center h-[72px] mt-6 mb-10 lg:mb-0")}>
          <p className={cn("text-3xl text-gray-800 font-light text-center mx-10")}>
            Explore code and art with instant feedback.
          </p>
        </div>
      )}
      <div className={cn("max-w-screen-lg lg:mx-auto mx-4 lg:my-10 my-4 editor-page")}>
        <Editor
          initialCode={initialCode}
          key={notebook.id}
          onUserInput={onUserInput}
          onBeforeEachRun={onBeforeEachRun}
          autoRun={autoRun}
          onDuplicate={isAdded ? onDuplicate : null}
          toolBarStart={
            <div className={cn("flex items-center gap-2")}>
              {!isAdded && (
                <button
                  onClick={onSave}
                  className={cn("bg-green-700 text-white rounded-md px-3 py-1 text-sm hover:bg-green-800")}
                >
                  Create
                </button>
              )}
              {!showInput && isAdded && (
                <button onClick={onRename}>
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {showInput || !isAdded ? (
                <input
                  type="text"
                  value={title}
                  onChange={onTitleChange}
                  onBlur={onTitleBlur}
                  onKeyDown={onTitleKeyDown}
                  ref={titleRef}
                  className={cn("border border-gray-200 rounded-md px-3 py-1 text-sm bg-white")}
                />
              ) : (
                <span className={cn("text-sm py-1 border border-gray-100 rounded-md")}>{notebook.title}</span>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
