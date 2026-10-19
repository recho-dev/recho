"use client";
import {useState, useEffect, useRef, useCallback, useSyncExternalStore} from "react";
import {notFound, useRouter} from "next/navigation";
import {Lock, Globe} from "lucide-react";
import {Editor} from "./Editor.jsx";
import {
  getNotebookById,
  createNotebook,
  addNotebook,
  saveNotebook,
  saveNotebookDebounced,
  flushPendingSave,
  hasUnsavedChanges,
  getNotebooks,
  duplicateNotebook,
  markRunning,
  clearRunning,
  PRIVATE,
  PUBLIC,
} from "./api.js";
import {isDirtyStore, countStore} from "./store.js";
import {confirmDialog} from "../components/Dialog.jsx";
import {authStore, ensureUser} from "./auth.js";
import {cn} from "./cn.js";
import {Button} from "../components/Button.jsx";
import {Input} from "../components/Input.jsx";
import {Listbox} from "../components/Listbox.jsx";
import {toast} from "../components/Toast.jsx";
import {isMac} from "../components/Kbd.jsx";
import {SafeLink} from "./SafeLink.jsx";
import {BASE_PATH, RUNTIMES} from "./shared.js";

const UNSET = Symbol("UNSET");

// Local and new notebooks have no owner yet, so they belong to whoever is editing.
function isOwnedBy(notebook, uid) {
  return !notebook?.ownerId || notebook.ownerId === uid;
}

export function EditorPage({id: initialId}) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(UNSET);
  const [notebookList, setNotebookList] = useState([]);
  const [autoRun, setAutoRun] = useState(false);
  const [id, setId] = useState(initialId);
  const [initialCode, setInitialCode] = useState(null);
  const [title, setTitle] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const titleRef = useRef(null);
  const linkCopiedTimer = useRef(null);
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
    setTitle(initialNotebook.title);
  }

  // This effect is triggered when the count changes,
  // which happens when user clicks the "New" nav link.
  useEffect(() => {
    if (!isAdded) loadNotebook(createNotebook(countStore.runtimeFor(count)));
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

  useEffect(() => () => clearTimeout(linkCopiedTimer.current), []);

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

  const isPublic = notebook.visibility === PUBLIC;

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

  // Only submit rename when blur with valid title.
  function onTitleBlur() {
    // The title can't be empty.
    if (!title) return setTitle(notebook.title);
    // Focusing and leaving the field changes nothing.
    if (title === notebook.title) return;
    const newNotebook = {...notebook, title};
    setNotebook(newNotebook);
    if (canSave) saveNotebookDebounced(newNotebook);
    else isDirtyStore.setDirty(true);
  }

  function onTitleChange(e) {
    setTitle(e.target.value);
  }

  function onTitleKeyDown(e) {
    // Leaving the field commits the title.
    if (e.key === "Enter") titleRef.current.blur();
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

  async function onToggleVisibility() {
    const visibility = isPublic ? PRIVATE : PUBLIC;
    const newNotebook = {...notebook, visibility};
    setNotebook(newNotebook);
    clearTimeout(linkCopiedTimer.current);
    setLinkCopied(false);
    try {
      // Save right away so the link works as soon as it's copied.
      await saveNotebook(newNotebook);
    } catch (error) {
      console.error(error);
      setNotebook((current) => ({...current, visibility: notebook.visibility}));
      toast(`Failed to change visibility: ${error.message}`, {error: true});
      return;
    }
    if (visibility !== PUBLIC) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      linkCopiedTimer.current = setTimeout(() => setLinkCopied(false), 2000);
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

  const languages = [
    {value: RUNTIMES.javascript, label: "JavaScript"},
    {value: RUNTIMES.wenyan, label: "文言 wenyan"},
    {value: RUNTIMES.mlscript, label: "MLscript"},
  ];

  return (
    <div>
      {!isAdded && notebookList.length > 0 && (
        <nav className={cn("recent")} aria-label="Your notebooks">
          <div className={cn("recent-in")}>
            {notebookList.map((notebook) => (
              <div key={notebook.id} className={cn("recent-item hide-sm")}>
                <SafeLink href={`/works/${notebook.id}`} className={cn("recent-title")}>
                  {notebook.title}
                </SafeLink>
                <span className={cn("status")}>Created {new Date(notebook.created).toLocaleDateString()}</span>
              </div>
            ))}
            <span className={cn("spacer")} />
            <Button as={SafeLink} variant="ghost" href="/works">
              View your notebooks
            </Button>
          </div>
        </nav>
      )}
      {!isAdded && notebookList.length === 0 && (
        <p className={cn("tagline")}>Explore code and art with instant feedback.</p>
      )}
      <div className={cn("page editor-page")}>
        <Editor
          initialCode={initialCode}
          runtime={notebook.runtime}
          key={notebook.id}
          onUserInput={onUserInput}
          onBeforeEachRun={onBeforeEachRun}
          autoRun={autoRun}
          onDuplicate={isAdded ? onDuplicate : null}
          status={isAdded && isOthers ? "View only" : null}
          toolBarStart={
            <>
              {isOthers ? (
                <h1 className={cn("tb-title")}>{notebook.title}</h1>
              ) : (
                <Input
                  plain
                  aria-label="Notebook title"
                  autoComplete="off"
                  value={title}
                  onChange={onTitleChange}
                  onBlur={onTitleBlur}
                  onKeyDown={onTitleKeyDown}
                  ref={titleRef}
                />
              )}
              {!isAdded && (
                <Listbox
                  label="Language"
                  ghost
                  options={languages}
                  value={notebook.runtime}
                  onChange={onChangeRuntime}
                />
              )}
              {!isAdded && <Button onClick={onSave}>Create</Button>}
              {canSave && (
                <Button
                  variant="ghost"
                  onClick={onToggleVisibility}
                  title={
                    isPublic
                      ? "Anyone with the link can view. Click to make private."
                      : "Only you can view. Click to make public."
                  }
                >
                  {isPublic ? (
                    <Globe className={cn("ic")} size={14} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Lock className={cn("ic")} size={14} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {linkCopied ? "Link copied" : isPublic ? "Public" : "Private"}
                </Button>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
