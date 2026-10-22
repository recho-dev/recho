import {useEffect, useRef, useState} from "react";
import {Play, Square, RefreshCcw} from "lucide-react";
import {createEditor} from "../../editor/index.js";
import {cn} from "../../components/cn.js";
import type {PluginValue, ViewPlugin} from "@codemirror/view";

interface EditorProps {
  className?: string;
  code: string;
  transactionViewerPlugin?: ViewPlugin<PluginValue>;
  blockViewerPlugin?: ViewPlugin<PluginValue>;
  onError?: (error: Error) => void;
}

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay = 0) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const onDefaultError = debounce(() => {
  setTimeout(() => {
    alert("Something unexpected happened. Please check the console for details.");
  }, 100);
}, 0);

type EditorRuntime = {
  run: () => void;
  stop: () => void;
  on: (event: unknown, callback: () => void) => unknown;
  destroy: () => void;
};

export function Editor({
  className,
  code,
  transactionViewerPlugin,
  blockViewerPlugin,
  onError = onDefaultError,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorRuntime>(null);
  const [needRerun, setNeedRerun] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = "";

      const extensions = [];
      if (transactionViewerPlugin) extensions.push(transactionViewerPlugin);
      if (blockViewerPlugin) extensions.push(blockViewerPlugin);

      editorRef.current = createEditor(containerRef.current, {
        code,
        extensions,
        onError,
      });

      // Auto-run on mount
      editorRef.current.run();
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [code, transactionViewerPlugin, blockViewerPlugin, onError]);

  useEffect(() => {
    const onInput = () => {
      setNeedRerun(true);
    };

    if (editorRef.current) {
      editorRef.current.on("userInput", onInput);
    }
  }, [code]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "s") {
        e.preventDefault();
        onRun();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onRun() {
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
    return typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl";
  }

  return (
    <div className={cn("w-full border border-gray-200 rounded-md overflow-hidden", className)}>
      <div className={cn("flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50")}>
        <div className="text-sm font-medium text-gray-700">Editor</div>
        <div className={cn("flex items-center gap-3")}>
          <button
            onClick={onRun}
            title={`Run Updated Code (${metaKey()}+S)`}
            className="hover:scale-110 transition-transform duration-100"
          >
            <Play className={cn("w-4 h-4", needRerun && "fill-black")} />
          </button>
          <button
            onClick={onRerun}
            title="Re-run Notebook"
            className="hover:scale-110 transition-transform duration-100"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={onStop} title="Stop Updating" className="hover:scale-110 transition-transform duration-100">
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div ref={containerRef}>
        <pre className={cn("text-sm hidden")}>{code}</pre>
      </div>
    </div>
  );
}
