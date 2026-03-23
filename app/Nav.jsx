"use client";

import {usePathname, useRouter} from "next/navigation";
import {useState, useEffect, useRef, useCallback, useSyncExternalStore} from "react";
import {SafeLink} from "./SafeLink.jsx";
import {cn} from "./cn.js";
import {Menu, FolderCode, ClipboardCheck, Check, Play} from "lucide-react";
import {Tooltip} from "react-tooltip";
import {evaluationStore} from "./evaluation/store.ts";
import {StartEvaluationDialog} from "./evaluation/StartEvaluationDialog.tsx";
import {TaskInputDialog} from "./evaluation/TaskInputDialog.tsx";
import {TaskCompleteDialog} from "./evaluation/TaskCompleteDialog.tsx";

const styles = {
  linkIcon: "w-5 h-5",
  link: "hover:bg-gray-100 px-3 rounded-md text-sm h-8 font-medium inline-flex items-center",
  selectedLink: "bg-gray-100",
  tooltip: "text-sm z-999",
  dropdown:
    "absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px] z-50",
  dropdownItem: "block px-3 py-2 text-sm hover:bg-gray-100",
  dropdownItemSelected: "bg-gray-100",
};

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  const evalState = useSyncExternalStore(
    evaluationStore.subscribe,
    evaluationStore.getSnapshot,
    evaluationStore.getServerSnapshot,
  );

  function isSelected(path) {
    return pathname.startsWith(path);
  }

  // Auto-pause when navigating to docs or examples during active evaluation
  useEffect(() => {
    if (!evalState.active || !evalState.currentTaskId) return;

    const isOnDocsOrExamples =
      pathname.startsWith("/docs") || pathname.startsWith("/examples");

    if (isOnDocsOrExamples && !evalState.paused) {
      evaluationStore.pauseEvaluation(pathname);
    } else if (!isOnDocsOrExamples && evalState.paused) {
      evaluationStore.resumeEvaluation();
    }
  }, [pathname, evalState.active, evalState.currentTaskId, evalState.paused]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Elapsed time counter for current task
  useEffect(() => {
    if (!evalState.active || !evalState.currentTaskStartTime) {
      setElapsed(0);
      return;
    }

    if (evalState.paused) {
      // Show frozen elapsed time when paused
      setElapsed(evalState.pausedElapsed);
      return;
    }

    // When running, compute elapsed = time since start minus total paused time
    const update = () => {
      setElapsed(Date.now() - evalState.currentTaskStartTime - evalState.totalPausedMs);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [evalState.active, evalState.currentTaskStartTime, evalState.paused, evalState.totalPausedMs]);

  // Hidden management page access: 5 rapid clicks or Cmd+Ctrl+Shift+click on brand
  const brandClicksRef = useRef([]);

  function handleBrandClick(e) {
    // Cmd+Ctrl+Shift+click → instant access
    if (e.metaKey && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      router.push("/evaluation/manage");
      return;
    }

    // Track rapid clicks (within 2s window)
    const now = Date.now();
    const clicks = brandClicksRef.current.filter((t) => now - t < 2000);
    clicks.push(now);
    brandClicksRef.current = clicks;

    if (clicks.length >= 5) {
      brandClicksRef.current = [];
      e.preventDefault();
      router.push("/evaluation/manage");
    }
  }

  return (
    <>
      <header className={cn("flex justify-between items-center p-4 border-b border-gray-200")}>
        <div className={cn("flex md:gap-2 items-center ")}>
          <button onClick={handleBrandClick} className={cn("text-left")}>
            <h1 className={cn("text-xl font-extrabold")}>Recho</h1>
          </button>
          <SafeLink href="/">
            <h1 className={cn("text-xl hidden md:inline font-medium")}>Notebook</h1>
          </SafeLink>
          {/* Desktop navigation */}
          <div className={cn("hidden md:flex gap-2 items-center")}>
            <SafeLink href="/docs" className={cn(styles.link, isSelected("/docs") && styles.selectedLink, "ml-3")}>
              Docs
            </SafeLink>
            <SafeLink href="/examples" className={cn(styles.link, isSelected("/examples") && styles.selectedLink)}>
              Examples
            </SafeLink>
          </div>
          {/* Mobile navigation */}
          <div className={cn("md:hidden relative")} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={cn(styles.link)}
              aria-label="More navigation options"
            >
              <Menu className={cn(styles.linkIcon)} />
            </button>
            {dropdownOpen && (
              <div className={cn(styles.dropdown)}>
                <SafeLink
                  href="/docs"
                  className={cn(styles.dropdownItem, isSelected("/docs") && styles.dropdownItemSelected)}
                  onClick={() => setDropdownOpen(false)}
                >
                  Docs
                </SafeLink>
                <SafeLink
                  href="/examples"
                  className={cn(styles.dropdownItem, isSelected("/examples") && styles.dropdownItemSelected)}
                  onClick={() => setDropdownOpen(false)}
                >
                  Examples
                </SafeLink>
              </div>
            )}
          </div>
        </div>

        {/* Center: evaluation status indicators */}
        {evalState.active && (
          <div className={cn("flex items-center gap-4 text-sm")}>
            <span className={cn("bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-medium")}>
              P#{evalState.participantId}
            </span>
            {evalState.currentTaskId && (
              <>
                <span className={cn("text-gray-500")}>Task {evalState.currentTaskId}</span>
                <span
                  className={cn(
                    "font-mono px-2 py-1 rounded-md",
                    evalState.paused ? "bg-yellow-100 text-yellow-800" : "bg-gray-100",
                  )}
                >
                  {formatElapsed(elapsed)}
                  {evalState.paused && " (paused)"}
                </span>
              </>
            )}
          </div>
        )}

        <div className={cn("flex gap-2 items-center")}>
          {!evalState.active ? (
            <button
              onClick={() => evaluationStore.openStartDialog()}
              className={cn(
                "bg-blue-600 text-white rounded-md px-3 text-sm h-8 font-medium inline-flex items-center gap-1 hover:bg-blue-700",
              )}
            >
              <ClipboardCheck className={cn("w-4 h-4")} />
              <span className={cn("hidden md:inline")}>Start Evaluation</span>
            </button>
          ) : evalState.paused ? (
            <SafeLink
              href="/"
              className={cn(
                "bg-yellow-600 text-white rounded-md px-3 text-sm h-8 font-medium inline-flex items-center gap-1 hover:bg-yellow-700",
              )}
            >
              <Play className={cn("w-4 h-4")} />
              <span className={cn("hidden md:inline")}>Resume Evaluation</span>
            </SafeLink>
          ) : (
            <button
              onClick={() => evaluationStore.openCompleteDialog()}
              className={cn(
                "bg-green-700 text-white rounded-md px-3 text-sm h-8 font-medium inline-flex items-center gap-1 hover:bg-green-800",
              )}
              disabled={!evalState.currentTaskId}
            >
              <Check className={cn("w-4 h-4")} />
              <span className={cn("hidden md:inline")}>Complete</span>
            </button>
          )}

          <SafeLink
            href="/works"
            className={cn(styles.link, pathname === "/works" && styles.selectedLink)}
            data-tooltip-id="nav-tooltip"
            data-tooltip-content="Open Notebooks"
          >
            <FolderCode className={cn(styles.linkIcon)} />
          </SafeLink>
        </div>
        <Tooltip id="nav-tooltip" className={cn(styles.tooltip)} />
      </header>

      {/* Evaluation dialogs */}
      <StartEvaluationDialog open={evalState.showStartDialog} />
      <TaskInputDialog open={evalState.showTaskInputDialog} onExit={() => router.push("/evaluation/questionnaire")} />
    </>
  );
}
