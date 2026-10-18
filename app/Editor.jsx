"use client";
import {useEffect, useRef, useState} from "react";
import {Play, Square, RefreshCcw, Copy} from "lucide-react";
import {Tooltip} from "react-tooltip";
import {createEditor} from "../editor/index.js";
import {loadLanguageSupport} from "../editor/languages/index.js";
import {loadLanguage} from "../runtime/languages/index.js";
import {cn} from "./cn.js";
import {LoadingBar} from "./LoadingBar.jsx";
import {languageOf} from "./shared.js";

// How the loading indicator names the languages that load on demand.
const LANGUAGE_NAMES = {mlscript: "MLscript", wenyan: "wenyan"};

const styles = {
  iconButton: "w-4 h-4 hover:scale-110 transition-transform duration-100",
};

function debounce(fn, delay = 0) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const onDefaultError = debounce(() => {
  setTimeout(() => {
    alert("Something unexpected happened. Please check the console for details.");
  }, 100);
}, 0);

export function Editor({
  initialCode,
  runtime = "javascript",
  onUserInput = () => {},
  onBeforeEachRun = () => {},
  autoRun = true,
  toolBarStart = null,
  pinToolbar = true,
  onDuplicate = null,
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
    const onKeyDown = (e) => {
      if (e.metaKey && e.key === "s") {
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

  function onRerun() {
    setNeedRerun(false);
    editorRef.current?.stop();
    editorRef.current?.run();
  }

  function metaKey() {
    return typeof navigator !== "undefined" || navigator.userAgent.includes("Mac") ? "cmd" : "ctrl";
  }

  return (
    <div className={cn("w-full border border-gray-200 rounded-md")}>
      <div
        className={cn(
          "flex justify-between items-center p-2 border-b border-gray-200 bg-gray-100",
          pinToolbar && "sticky top-0 z-10",
        )}
      >
        {toolBarStart}
        <div className={cn("flex items-center gap-3")}>
          {compiling && (
            <span role="status" className={cn("text-xs text-gray-500")}>
              Compiling…
            </span>
          )}
          <button
            onClick={onRun}
            data-tooltip-id="action-tooltip"
            data-tooltip-content={`Run Updated Code (${metaKey()}+s)`}
            data-tooltip-place="bottom"
          >
            <Play className={cn(styles.iconButton, needRerun && "fill-black")} />
          </button>
          <button
            onClick={onRerun}
            data-tooltip-id="action-tooltip"
            data-tooltip-content="Re-run Notebook"
            data-tooltip-place="bottom"
          >
            <RefreshCcw className={cn(styles.iconButton)} />
          </button>
          <button
            onClick={onStop}
            data-tooltip-id="action-tooltip"
            data-tooltip-content="Stop Updating"
            data-tooltip-place="bottom"
          >
            <Square className={cn(styles.iconButton)} />
          </button>
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              data-tooltip-id="action-tooltip"
              data-tooltip-content="Duplicate Notebook"
              data-tooltip-place="bottom"
            >
              <Copy className={cn(styles.iconButton)} />
            </button>
          )}
        </div>
      </div>
      <div className={cn("relative")}>
        {loading.parts.length > 0 && !loadError && (
          <LoadingBar
            loading={loading.remaining.length > 0}
            label={`Loading ${LANGUAGE_NAMES[languageOf(runtime)] ?? languageOf(runtime)} ${(loading.remaining.length ? loading.remaining : loading.parts).join(" and ")}…`}
          />
        )}
        {loadError && (
          <div className={cn("p-4 text-sm")}>
            <p className={cn("text-red-700")}>Couldn&apos;t load this notebook&apos;s language: {loadError.message}</p>
            <button
              onClick={() => setLoadAttempt((n) => n + 1)}
              className={cn("mt-2 px-2 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-100")}
            >
              Retry
            </button>
            {/* The code, read-only, so that it can still be read or copied. */}
            <pre className={cn("mt-4 font-mono text-gray-700 overflow-x-auto")}>{initialCode}</pre>
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
          <pre className={cn("text-sm hidden")}>{initialCode}</pre>
        </div>
      </div>
      <Tooltip id="action-tooltip" className={cn("z-999")} />
    </div>
  );
}
