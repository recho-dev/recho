"use client";
import {useEffect, useRef, useState} from "react";
import {Play, Square} from "lucide-react";
import {createEditor} from "../editor/index.js";
import {loadLanguageSupport} from "../editor/languages/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {cn} from "../components/cn.js";
import {Button} from "../components/Button.jsx";
import {isMac, useShortcut} from "../components/Kbd.jsx";
import {toast} from "../components/Toast.jsx";
import {LoadingBar} from "./LoadingBar.jsx";
import {languageOf} from "./shared.js";

// How the loading indicator names the languages that load on demand.
const LANGUAGE_NAMES = {mlscript: "MLscript", wenyan: "wenyan"};

function debounce(fn, delay = 0) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const onDefaultError = debounce(() => {
  toast("Something unexpected happened. Please check the console for details.", {error: true});
}, 0);

export function Editor({
  initialCode,
  runtime = "javascript",
  onUserInput = () => {},
  onBeforeEachRun = () => {},
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

  const onRunCellRef = useRef(null);
  onRunCellRef.current = () => {
    onBeforeEachRun();
    setNeedRerun(false);
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
        editorRef.current = createEditor(containerRef.current, {code: initialCode, onError, language, languageSupport});
        editorRef.current.on("userInput", (code) => onInputRef.current(code));
        editorRef.current.on("status", ({compiling}) => !cancelled && setCompiling(compiling));
        // A block's play button runs the code too.
        editorRef.current.on("run", () => onRunCellRef.current());
        if (autoRun) onRun();
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
    onBeforeEachRun();
    setNeedRerun(false);
    editorRef.current?.run();
  }

  function onStop() {
    setNeedRerun(false);
    editorRef.current?.stop();
  }

  const shortcut = useShortcut("S");
  // Edits stop the outputs updating until the next run.
  const shownStatus = compiling ? "Compiling…" : needRerun ? "Edited" : null;
  // The dot's colour: busy while compiling, waiting while edits haven't run.
  const statusState = compiling ? "busy" : needRerun ? "waiting" : null;

  return (
    <div className="editor-frame">
      <div className={cn("toolbar", pinToolbar && "pinned")} role="toolbar" aria-label="Notebook">
        <Button variant="primary" className="tb-run" onClick={onRun} aria-keyshortcuts="Meta+S Control+S">
          <Play className="ic" size={12} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
          Run {shortcut && <span className="kbd-in hide-sm">{shortcut}</span>}
        </Button>
        <Button className="tb-run" tip="Stop updating" onClick={onStop}>
          <Square className="ic" size={9} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
          <span className="lbl">Stop</span>
        </Button>
        {shownStatus && (
          <span key={shownStatus} role="status" className="status swap-in" data-state={statusState ?? undefined}>
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
            label={`Loading ${LANGUAGE_NAMES[languageOf(runtime)] ?? languageOf(runtime)} ${(loading.remaining.length ? loading.remaining : loading.parts).join(" and ")}…`}
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
