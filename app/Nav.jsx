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

const mdnLinks = [
  {
    category: "Language Basics",
    links: [
      {
        label: "Grammar & Types",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types",
      },
      {
        label: "Control Flow",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling",
      },
      {
        label: "Loops & Iteration",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration",
      },
      {label: "Functions", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions"},
      {
        label: "Expressions & Operators",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators",
      },
      {
        label: "Template Literals",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals",
      },
    ],
  },
  {
    category: "Built-in Objects",
    links: [
      {label: "Array", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array"},
      {
        label: "String",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String",
      },
      {label: "Math", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math"},
      {
        label: "Number",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number",
      },
      {
        label: "Object",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object",
      },
      {label: "Map", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map"},
      {label: "Set", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set"},
      {label: "JSON", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON"},
      {label: "Date", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date"},
      {
        label: "RegExp",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp",
      },
    ],
  },
  {
    category: "Advanced",
    links: [
      {
        label: "Destructuring",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment",
      },
      {
        label: "Spread Syntax",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      },
      {
        label: "Arrow Functions",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      },
      {label: "Classes", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes"},
      {
        label: "Promises",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
      },
      {
        label: "async / await",
        href: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises",
      },
    ],
  },
];

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
  const [mdnOpen, setMdnOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mdnRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  const evalState = useSyncExternalStore(
    evaluationStore.subscribe,
    evaluationStore.getSnapshot,
    evaluationStore.getServerSnapshot,
  );

  function isSelected(path) {
    return pathname.startsWith(path);
  }

  // Navigate to questionnaire when the store signals it
  useEffect(() => {
    if (evalState.pendingQuestionnaire) {
      evaluationStore.clearPendingQuestionnaire();
      router.push("/evaluation/questionnaire");
    }
  }, [evalState.pendingQuestionnaire, router]);

  // Auto-pause when navigating to docs or examples during active evaluation
  useEffect(() => {
    if (!evalState.active || !evalState.currentTaskId) return;

    const isOnDocsOrExamples = pathname.startsWith("/docs") || pathname.startsWith("/examples");

    if (isOnDocsOrExamples && !evalState.paused) {
      evaluationStore.pauseEvaluation(pathname);
    } else if (!isOnDocsOrExamples && evalState.paused) {
      evaluationStore.resumeEvaluation();
    }
  }, [pathname, evalState.active, evalState.currentTaskId, evalState.paused]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (mdnRef.current && !mdnRef.current.contains(event.target)) {
        setMdnOpen(false);
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
  }, [
    evalState.active,
    evalState.currentTaskStartTime,
    evalState.paused,
    evalState.pausedElapsed,
    evalState.totalPausedMs,
  ]);

  // Hidden management page access: 5 rapid clicks or Cmd+Ctrl+Shift+click on brand
  const brandClicksRef = useRef([]);

  function handleBrandClick(e) {
    // Cmd+Ctrl+Shift+click → instant access
    if (e.metaKey && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      router.push("/evaluation/manage/sessions");
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
      router.push("/evaluation/manage/sessions");
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
            <div className={cn("relative")} ref={mdnRef}>
              <button onClick={() => setMdnOpen(!mdnOpen)} className={cn(styles.link, mdnOpen && styles.selectedLink)}>
                MDN
                <svg className={cn("w-3 h-3 ml-1")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mdnOpen && (
                <div
                  className={cn(
                    "absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-2 z-50",
                  )}
                  style={{width: "280px"}}
                >
                  {mdnLinks.map((group) => (
                    <div key={group.category}>
                      <div className={cn("px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider")}>
                        {group.category}
                      </div>
                      {group.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100")}
                          onClick={() => setMdnOpen(false)}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <div className={cn(styles.dropdown)} style={{minWidth: "200px"}}>
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
                <div className={cn("border-t border-gray-100 my-1")} />
                <div className={cn("px-3 py-1 text-xs font-semibold text-gray-400 uppercase")}>MDN Reference</div>
                {mdnLinks.flatMap((group) =>
                  group.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(styles.dropdownItem)}
                      onClick={() => setDropdownOpen(false)}
                    >
                      {link.label}
                    </a>
                  )),
                )}
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
            {evalState.syncStatus === "syncing" && (
              <span className={cn("bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium")}>Syncing</span>
            )}
            {evalState.syncStatus === "error" && (
              <span
                className={cn("bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-medium")}
                title={evalState.syncError ?? "Sync error"}
              >
                Sync issue
              </span>
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
      <TaskInputDialog open={evalState.showTaskInputDialog} onStart={() => router.push("/")} />
    </>
  );
}
