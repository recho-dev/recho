"use client";
import {useEffect, useRef, useState} from "react";
import {Eraser, Play, Square} from "lucide-react";
import {createEditor} from "../editor/index.js";
import {loadLanguageSupport} from "../editor/languages/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {cn} from "../components/cn.js";
import {Button} from "../components/Button.jsx";
import {isMac, useShortcut} from "../components/shortcut.js";
import {toast} from "../components/Toast.jsx";
import {LoadingBar} from "./LoadingBar.jsx";
import {languageOf, languageName} from "./shared.js";

// The site of the runtime page (runtime/frame/), whose iframe runs notebooks
// apart from this page: their code can't reach the user's sign-in, and an
// infinite loop freezes only the frame. Without one (e.g. in development
// unless it's set), notebooks run in this page.
const RUNTIME_ORIGIN =
  process.env.NEXT_PUBLIC_RUNTIME_ORIGIN ||
  (process.env.NODE_ENV === "production" ? "https://recho-runtime.vercel.app" : null);

// Code kept while it doesn't respond. The browser can't give the page a new
// frame until the tab is closed (see ../editor/remoteRuntime.js), so the code
// is kept for when the notebook is opened again. By page and editor.
function stashKey(id, initialCode) {
  let hash = 0;
  for (let i = 0; i < (initialCode ?? "").length; i++) hash = (Math.imul(31, hash) + initialCode.charCodeAt(i)) | 0;
  return `recho:stuck:${window.location.pathname}:${id ?? hash}`;
}

function readStash(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStash(key, code) {
  try {
    if (code === null) localStorage.removeItem(key);
    else localStorage.setItem(key, code);
  } catch {
    // Without storage, the notebook opens with the code as it was loaded.
  }
}

// How the loading indicator names the languages that load on demand.

function debounce(fn, delay = 0) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const onDefaultError = debounce((error) => {
  // The runtime failing to start says what to do.
  const message =
    error?.code === "RECHO_RUNTIME_LOAD"
      ? error.message
      : "Something unexpected happened. Please check the console for details.";
  toast(message, {error: true});
}, 0);

export function Editor({
  // Which notebook this is, to keep its code while it doesn't respond; by
  // default, its code identifies it.
  id = null,
  initialCode,
  runtime = "javascript",
  onUserInput = () => {},
  onBeforeEachRun = () => {},
  onHang = () => {},
  autoRun = true,
  fileName = null,
  pinToolbar = true,
  onError = onDefaultError,
}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const [needRerun, setNeedRerun] = useState(false);
  const [loadError, setLoadError] = useState(null);
  // Bumped by Retry, to load the language again after it failed.
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Whether the language is taking long to compile the code.
  const [compiling, setCompiling] = useState(false);
  // Whether the code has stopped responding (it runs in a frame).
  const [hung, setHung] = useState(false);
  // For a language that loads on demand: the parts it loads (e.g. compiler,
  // syntax highlighting) and those still loading.
  const [loading, setLoading] = useState({parts: [], remaining: []});

  // The editor is created asynchronously, so it calls the latest handler
  // through this ref.
  const onInputRef = useRef(null);
  onInputRef.current = (code) => {
    onUserInput(code);
    setNeedRerun(true);
  };

  // Where the code is kept while it doesn't respond. Code kept from before
  // is dropped once it runs or is edited (not when it's read, so that it
  // survives the editor being created twice).
  const stash = useRef(null);
  const hungRef = useRef(false);
  const clearStash = () => !hungRef.current && stash.current && writeStash(stash.current, null);

  const onRunCellRef = useRef(null);
  onRunCellRef.current = () => {
    clearStash();
    onBeforeEachRun();
    setNeedRerun(false);
  };

  const onStatusRef = useRef(null);
  onStatusRef.current = (status) => {
    if (typeof status.compiling === "boolean") setCompiling(status.compiling);
    if (typeof status.hung === "boolean" && status.hung !== hungRef.current) {
      hungRef.current = status.hung;
      setHung(status.hung);
      if (status.hung) {
        if (editorRef.current) writeStash(stash.current, editorRef.current.getCode());
        toast("This notebook stopped responding. Close this tab, then open the notebook again; your code is kept.", {
          error: true,
          duration: 15000,
        });
        onHang();
      } else {
        clearStash();
      }
    }
  };

  useEffect(() => {
    // Languages other than JavaScript load their compiler and editor support
    // on demand, so creating the editor waits for them.
    let cancelled = false;
    setLoadError(null);
    const onDemand = languageOf(runtime) !== "javascript";
    const track = (part, promise) => {
      if (!onDemand) return promise;
      setLoading(({parts, remaining}) => ({parts: [...parts, part], remaining: [...remaining, part]}));
      const done = () =>
        !cancelled && setLoading(({parts, remaining}) => ({parts, remaining: remaining.filter((p) => p !== part)}));
      promise.then(done, done);
      return promise;
    };
    setLoading({parts: [], remaining: []});
    Promise.all([
      track("compiler", loadLanguage(runtime)),
      track("syntax highlighting", loadLanguageSupport(languageOf(runtime))),
    ]).then(
      ([language, languageSupport]) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        stash.current = stashKey(id, initialCode);
        const restored = readStash(stash.current);
        editorRef.current = createEditor(containerRef.current, {
          code: restored ?? initialCode,
          onError,
          language,
          languageSupport,
          runtimeOrigin: RUNTIME_ORIGIN,
        });
        editorRef.current.on("userInput", (code) => {
          // Edits made while it doesn't respond are kept too.
          if (hungRef.current) writeStash(stash.current, code);
          else clearStash();
          onInputRef.current(code);
        });
        editorRef.current.on("status", (status) => !cancelled && onStatusRef.current(status));
        // A block's play button runs the code too.
        editorRef.current.on("run", () => onRunCellRef.current());
        // Code kept from a notebook that stopped responding is shown as
        // edited, and not run: it may be what stopped responding.
        if (restored !== null) {
          if (restored !== initialCode) onInputRef.current(restored);
        } else if (autoRun) onRun();
      },
      (error) => {
        // E.g. the language's code failed to download, or it's unknown.
        console.error(error);
        if (!cancelled) setLoadError(error);
      },
    );
    return () => {
      cancelled = true;
      setCompiling(false);
      setHung(false);
      hungRef.current = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, runtime, loadAttempt]);

  useEffect(() => {
    // ⌘S on a Mac, Ctrl+S elsewhere, as the Run button's hint says. It also
    // reaches here when the editor's own Mod-s binding runs the code, so the
    // "Edited" status clears either way.
    const onKeyDown = (e) => {
      if ((isMac() ? e.metaKey : e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        setNeedRerun(false);
        editorRef.current?.run(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onRun() {
    // Nothing to run until the editor exists (its language may be loading).
    if (!editorRef.current) return;
    clearStash();
    onBeforeEachRun();
    setNeedRerun(false);
    editorRef.current?.run();
  }

  function onStop() {
    setNeedRerun(false);
    editorRef.current?.stop();
  }

  function onClear() {
    editorRef.current?.clear();
    // Clearing is an edit, but there's nothing new to run.
    setNeedRerun(false);
  }

  const shortcut = useShortcut("S");
  // Edits stop the outputs updating until the next run.
  const shownStatus = hung ? "Not responding" : compiling ? "Compiling…" : needRerun ? "Edited" : null;
  // The dot's colour: busy while compiling, waiting while edits haven't run
  // or while the code doesn't respond.
  const statusState = hung ? "waiting" : compiling ? "busy" : needRerun ? "waiting" : null;

  return (
    <div className="editor-frame">
      <div className={cn("toolbar", pinToolbar && "pinned")} role="toolbar" aria-label="Notebook">
        <Button variant="primary" className="tb-action" onClick={onRun} aria-keyshortcuts="Meta+S Control+S">
          <Play className="ic" size={12} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
          Run {shortcut && <span className="kbd-in hide-sm">{shortcut}</span>}
        </Button>
        <Button className="tb-action" tip="Stop updating" onClick={onStop}>
          <Square className="ic" size={9} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
          <span className="lbl">Stop</span>
        </Button>
        <Button className="tb-action" tip="Stop and clear output" onClick={onClear}>
          <Eraser className="ic" size={12} strokeWidth={1.75} aria-hidden="true" />
          <span className="lbl">Clear</span>
        </Button>
        {shownStatus && (
          <span
            key={shownStatus}
            role="status"
            className="status swap-in"
            data-state={statusState ?? undefined}
            title={hung ? "Close this tab and open the notebook again; your code is kept" : undefined}
          >
            {shownStatus}
          </span>
        )}
        <span className="spacer" />
        {fileName && <span className="tb-file">{fileName}</span>}
      </div>
      <div className="editor-body">
        {loading.parts.length > 0 && !loadError && (
          <LoadingBar
            loading={loading.remaining.length > 0}
            label={`Loading ${languageName(runtime)} ${(loading.remaining.length ? loading.remaining : loading.parts).join(" and ")}…`}
          />
        )}
        {loadError && (
          <div className="load-error">
            <p className="status err">Couldn&apos;t load this notebook&apos;s language: {loadError.message}</p>
            <Button className="mt-2" onClick={() => setLoadAttempt((n) => n + 1)}>
              Retry
            </Button>
            {/* The code, read-only, so that it can still be read or copied. */}
            <pre>{initialCode}</pre>
          </div>
        )}
        <div
          ref={containerRef}
          // While loading, the area keeps room for the indicator; then it eases to
          // the editor's height as the indicator fades into the editor.
          className={cn(
            "transition-[min-height] duration-500 ease-out",
            loading.remaining.length > 0 ? "min-h-80" : "min-h-0",
          )}
        >
          <pre className="hidden">{initialCode}</pre>
        </div>
      </div>
    </div>
  );
}
