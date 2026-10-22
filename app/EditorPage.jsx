"use client";
import {useState, useEffect, useRef, useCallback, useSyncExternalStore} from "react";
import {notFound, useRouter} from "next/navigation";
import {Copy} from "lucide-react";
import {Editor} from "./Editor.jsx";
import {TitleSection} from "./TitleSection.jsx";
import {NotebookTitle} from "./NotebookTitle.jsx";
import {
  getNotebookById,
  createNotebook,
  addNotebook,
  saveNotebook,
  saveNotebookDebounced,
  flushPendingSave,
  hasUnsavedChanges,
  duplicateNotebook,
  markRunning,
  clearRunning,
  PRIVATE,
  PUBLIC,
  VISIBILITIES,
} from "./api.js";
import {isDirtyStore, countStore} from "./store.js";
import {confirmDialog} from "../components/Dialog.jsx";
import {authStore, ensureUser} from "./auth.js";
import {cn} from "../components/cn.js";
import {Button} from "../components/Button.jsx";
import {Listbox} from "../components/Listbox.jsx";
import {toast} from "../components/Toast.jsx";
import {isMac} from "../components/shortcut.js";
import {BASE_PATH, LANGUAGES, fileNameOf} from "./shared.js";

const UNSET = Symbol("UNSET");

// Local and new notebooks have no owner yet, so they belong to whoever is editing.
function isOwnedBy(notebook, uid) {
  return !notebook?.ownerId || notebook.ownerId === uid;
}

/**
 * A saved notebook when `id` is given, otherwise a new, unsaved one. A new
 * notebook is in `runtime` unless the New menu asks for another language.
 */
export function EditorPage({id: initialId, runtime: initialRuntime}) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(UNSET);
  const [autoRun, setAutoRun] = useState(false);
  const [id, setId] = useState(initialId);
  const [initialCode, setInitialCode] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Bumped to focus and select the title, for a notebook made from the New menu.
  const [titleFocus, setTitleFocus] = useState(null);
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
  const isOthers = !isOwnedBy(notebook, uid); // Someone else's public notebook.
  const canSave = isAdded && !!user && !isOthers; // Local notebooks are read-only until the user logs in.
  const timer = useRef(null);

  const onSave = useCallback(async () => {
    // Someone else's notebook can only be duplicated.
    if (isOthers) return;
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
      toast(`Failed to save notebook: ${error.message}`, {error: true});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebook, isOthers]);

  function loadNotebook(initialNotebook) {
    setNotebook(initialNotebook ?? null);
    if (!initialNotebook) return;
    setInitialCode(initialNotebook.content);
    setAutoRun(initialNotebook.autoRun);
  }

  // This effect is triggered when the count changes, which happens when the
  // user picks a language from the New menu or clicks the wordmark.
  useEffect(() => {
    if (isAdded) return;
    const runtime = countStore.runtimeFor(count) ?? initialRuntime;
    loadNotebook(createNotebook(runtime));
    // Only a template or the New menu asks for a runtime; the wordmark also starts a notebook.
    if (runtime) setTitleFocus(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Load the saved notebook once auth is resolved, and again when the user changes.
  useEffect(() => {
    if (!isAdded || authLoading) return;
    // Keep edits made while logged out on screen instead of reloading the
    // uploaded copy, and save them once the user is logged in.
    if (notebook !== UNSET && notebook?.id === id && isDirtyStore.getSnapshot()) {
      if (user && isOwnedBy(notebook, user.uid)) {
        saveNotebookDebounced(notebook);
        isDirtyStore.setDirty(false);
      }
      return;
    }
    let cancelled = false;
    setLoadError(null);
    getNotebookById(id)
      .then((initialNotebook) => !cancelled && loadNotebook(initialNotebook))
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoadError(error);
      });
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, authLoading, uid, reloadKey]);

  // Save pending changes when leaving the page.
  useEffect(() => () => flushPendingSave(), []);

  useEffect(() => {
    // Use setTimeout to avoid changing to default title.
    setTimeout(() => {
      document.title = `${isAdded ? notebook.title : "New"} | Recho`;
    }, 100);
  }, [notebook, isAdded]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      // Also warn when edits haven't been written to the cloud yet.
      if (isDirty || hasUnsavedChanges()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((isMac() ? e.metaKey : e.ctrlKey) && e.key === "s") onSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave]);

  if (loadError) {
    return (
      <div className={cn("page editor-page")}>
        <div className={cn("empty")}>
          <p>Failed to load notebook.</p>
          <Button onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </div>
      </div>
    );
  }

  if (notebook === UNSET)
    return (
      <div className={cn("page editor-page")}>
        <p className={cn("status")}>Loading…</p>
      </div>
    );

  if (!notebook) return notFound();

  // A new notebook starts over in the chosen language.
  async function onChangeRuntime(runtime) {
    if (
      isDirtyStore.getSnapshot() &&
      !(await confirmDialog({
        title: "Start a new notebook?",
        message: "Switching the language starts a new notebook, and your changes will be lost.",
        confirmLabel: "Discard and switch",
        cancelLabel: "Keep editing",
        danger: true,
      }))
    )
      return;
    isDirtyStore.setDirty(false);
    loadNotebook(createNotebook(runtime));
  }

  function onUserInput(code) {
    const newNotebook = {...notebook, content: code};
    setNotebook(newNotebook);
    if (canSave) saveNotebookDebounced(newNotebook);
    else isDirtyStore.setDirty(true);
  }

  function onRename(title) {
    const newNotebook = {...notebook, title};
    setNotebook(newNotebook);
    if (canSave) saveNotebookDebounced(newNotebook);
    else isDirtyStore.setDirty(true);
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

  async function onChangeVisibility(visibility) {
    const newNotebook = {...notebook, visibility};
    // Explore lists notebooks by when they were made public.
    if (visibility === PUBLIC) newNotebook.published = new Date().toISOString();
    setNotebook(newNotebook);
    try {
      // Save right away so the link works as soon as it's copied.
      await saveNotebook(newNotebook);
    } catch (error) {
      console.error(error);
      setNotebook((current) => ({...current, visibility: notebook.visibility, published: notebook.published}));
      toast(`Failed to change visibility: ${error.message}`, {error: true});
      return;
    }
    if (visibility === PRIVATE) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch (error) {
      console.error("Failed to copy link", error);
    }
  }

  async function onDuplicate() {
    if (!(await ensureUser())) return;
    const duplicated = duplicateNotebook(notebook);
    try {
      await addNotebook(duplicated);
      router.push(`/works/${duplicated.id}`);
    } catch (error) {
      console.error(error);
      toast(`Failed to duplicate notebook: ${error.message}`, {error: true});
    }
  }

  const languages = LANGUAGES.map(({runtime, label}) => ({value: runtime, label}));

  // Who made the notebook and when. Only the owner's own name is known.
  const author = !isOthers && user ? (user.displayName ?? user.email) : null;
  const details = [
    author,
    isAdded && notebook.created ? `Created ${new Date(notebook.created).toLocaleDateString("en-CA")}` : "Not saved yet",
    isOthers && "View only",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* The list of recent notebooks is hidden until its redesign (#254). */}
      <div className={cn("page editor-page")}>
        <TitleSection
          title={
            isOthers ? (
              <h1 className={cn("page-title")}>{notebook.title}</h1>
            ) : (
              <NotebookTitle value={notebook.title} onChange={onRename} focusKey={titleFocus} />
            )
          }
          details={details}
          actions={
            <>
              {!isAdded && (
                <Listbox
                  label="Language"
                  ghost
                  align="right"
                  options={languages}
                  value={notebook.runtime}
                  onChange={onChangeRuntime}
                />
              )}
              {!isAdded && <Button onClick={onSave}>Create</Button>}
              {canSave && (
                <Listbox
                  label="Visibility"
                  ghost
                  align="right"
                  options={VISIBILITIES}
                  value={notebook.visibility}
                  onChange={onChangeVisibility}
                />
              )}
              {isAdded && (
                <Button onClick={onDuplicate} tip="Duplicate notebook">
                  <Copy className={cn("ic")} size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span className={cn("lbl")}>Duplicate</span>
                </Button>
              )}
            </>
          }
        />
        <Editor
          initialCode={initialCode}
          runtime={notebook.runtime}
          key={notebook.id}
          onUserInput={onUserInput}
          onBeforeEachRun={onBeforeEachRun}
          autoRun={autoRun}
          fileName={fileNameOf(notebook.title, notebook.runtime)}
        />
      </div>
    </div>
  );
}
