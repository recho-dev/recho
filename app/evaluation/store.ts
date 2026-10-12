import {getTaskById, loadTasks} from "./tasks.ts";
import type {
  CompletedTask,
  EvaluationSession,
  EvaluationState,
  PauseEvent,
  QuestionnaireResponse,
  TransactionRecord,
} from "./types.ts";

const listeners = new Set<() => void>();

const CHECKPOINT_INTERVAL_MS = 5000;
const MAX_PENDING_TRANSACTIONS = 200;

let state: EvaluationState = {
  active: false,
  evaluationId: null,
  participantName: "",
  participantId: null,
  showStartDialog: false,
  showTaskInputDialog: false,
  showCompleteDialog: false,
  paused: false,
  currentTaskId: null,
  currentTaskClientId: null,
  currentTaskIndex: 0,
  currentTaskStartTime: null,
  currentCode: null,
  pausedElapsed: 0,
  totalPausedMs: 0,
  currentPauseStart: null,
  currentPauseEvents: [],
  currentTransactions: [],
  completedTasks: [],
  questionnaire: null,
  pendingQuestionnaire: false,
  syncStatus: "idle",
  syncError: null,
};

let sessionStartTime: number | null = null;
let currentTaskServerId: string | null = null;
let currentTaskDraftPromise: Promise<string | null> | null = null;
let pendingTransactions: TransactionRecord[] = [];
let pendingPauseEvents: PauseEvent[] = [];
let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
let checkpointPromise: Promise<boolean> = Promise.resolve(true);
let lastCheckpointCode: string | null = null;
let lastCheckpointTime: number | null = null;

function emitChange() {
  for (const listener of listeners) listener();
}

function setState(partial: Partial<EvaluationState>) {
  state = {...state, ...partial};
  emitChange();
}

function setSyncState(status: EvaluationState["syncStatus"], error: string | null = null) {
  if (state.syncStatus === status && state.syncError === error) {
    return;
  }
  setState({syncStatus: status, syncError: error});
}

function parseErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function notifySyncFailure(message: string) {
  if (typeof window !== "undefined") {
    window.alert(message);
  }
}

function clearCheckpointTimer() {
  if (checkpointTimer) {
    clearTimeout(checkpointTimer);
    checkpointTimer = null;
  }
}

function resetTaskSyncInternals() {
  clearCheckpointTimer();
  currentTaskServerId = null;
  currentTaskDraftPromise = null;
  pendingTransactions = [];
  pendingPauseEvents = [];
  checkpointPromise = Promise.resolve(true);
  lastCheckpointCode = null;
  lastCheckpointTime = null;
}

function currentTaskStarterCode() {
  return state.currentTaskId ? (getTaskById(state.currentTaskId)?.code ?? "") : "";
}

function createClientTaskId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (typeof uuid === "string" && uuid.length > 0) {
    return uuid;
  }

  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sumPauseDurations(pauseEvents: PauseEvent[]) {
  return pauseEvents.reduce((total, pauseEvent) => {
    if (pauseEvent.resumedAt == null) {
      return total;
    }

    return total + Math.max(0, pauseEvent.resumedAt - pauseEvent.pausedAt);
  }, 0);
}

function normalizeRecoveredPauseEvents(pauseEvents: PauseEvent[], resumedAt: number) {
  const recoveredPauseEvents: PauseEvent[] = [];
  const normalizedPauseEvents = pauseEvents.map((pauseEvent) => {
    if (pauseEvent.resumedAt != null) {
      return pauseEvent;
    }

    const closedPauseEvent = {...pauseEvent, resumedAt};
    recoveredPauseEvents.push(closedPauseEvent);
    return closedPauseEvent;
  });

  return {normalizedPauseEvents, recoveredPauseEvents};
}

function restoreEvaluationSession(session: EvaluationSession) {
  const evaluationId = typeof session.id === "string" ? session.id : null;
  const completedTasks = session.tasks.filter((task) => task.status === "completed");
  const currentTask = [...session.tasks].reverse().find((task) => task.status !== "completed") ?? null;
  const resumedAt = Date.now();
  const {normalizedPauseEvents, recoveredPauseEvents} = currentTask
    ? normalizeRecoveredPauseEvents(currentTask.pauseEvents, resumedAt)
    : {normalizedPauseEvents: [], recoveredPauseEvents: []};
  const currentCode = currentTask ? (currentTask.latestCode ?? currentTask.finalCode ?? currentTask.initialCode) : null;

  resetTaskSyncInternals();
  sessionStartTime = session.sessionStartTime;
  pendingPauseEvents = recoveredPauseEvents;
  lastCheckpointCode = currentCode;
  lastCheckpointTime = currentTask?.lastCheckpointTime ?? null;

  setState({
    active: Boolean(evaluationId),
    evaluationId,
    participantName: session.participantName,
    participantId: session.participantId,
    showStartDialog: false,
    showTaskInputDialog: currentTask == null,
    showCompleteDialog: false,
    paused: false,
    currentTaskId: currentTask?.taskId ?? null,
    currentTaskClientId: currentTask?.clientTaskId ?? null,
    currentTaskIndex: completedTasks.length,
    currentTaskStartTime: currentTask?.startTime ?? null,
    currentCode,
    pausedElapsed: 0,
    totalPausedMs: currentTask ? sumPauseDurations(normalizedPauseEvents) : 0,
    currentPauseStart: null,
    currentPauseEvents: currentTask ? normalizedPauseEvents : [],
    currentTransactions: currentTask ? [...currentTask.transactions] : [],
    completedTasks,
    questionnaire: session.questionnaire,
    pendingQuestionnaire: false,
    syncStatus: "idle",
    syncError: null,
  });
}

async function ensureTaskDraftExists() {
  if (currentTaskServerId) {
    return currentTaskServerId;
  }

  if (currentTaskDraftPromise) {
    return currentTaskDraftPromise;
  }

  if (!state.evaluationId || !state.currentTaskId || !state.currentTaskClientId || state.currentTaskStartTime == null) {
    return null;
  }

  const task = getTaskById(state.currentTaskId);
  if (!task) {
    return null;
  }

  currentTaskDraftPromise = (async () => {
    setSyncState("syncing", null);

    try {
      const response = await fetch(`/api/evaluations/${state.evaluationId}/tasks`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          clientTaskId: state.currentTaskClientId,
          taskId: state.currentTaskId,
          difficulty: task.difficulty,
          startTime: state.currentTaskStartTime,
          initialCode: task.code,
          latestCode: state.currentCode ?? task.code,
        }),
      });

      if (!response.ok) {
        throw new Error(`Task draft request failed (${response.status})`);
      }

      const data = await response.json();
      currentTaskServerId = typeof data.id === "string" ? data.id : null;
      if (!currentTaskServerId) {
        throw new Error("Task draft response did not include an ID.");
      }

      setSyncState("idle", null);
      return currentTaskServerId;
    } catch (error) {
      currentTaskDraftPromise = null;
      const message = parseErrorMessage(error, "Failed to create the task draft.");
      setSyncState("error", message);
      console.error("Failed to create task draft:", error);
      return null;
    }
  })();

  return currentTaskDraftPromise;
}

async function flushTaskCheckpoint(options?: {
  complete?: boolean;
  finalCode?: string;
  endTime?: number;
  force?: boolean;
}) {
  if (!state.active || !state.evaluationId || !state.currentTaskId || !state.currentTaskClientId) {
    return true;
  }

  const finalCode = typeof options?.finalCode === "string" ? options.finalCode : undefined;
  const latestCode = finalCode ?? state.currentCode ?? currentTaskStarterCode();
  const transactionsToSend = pendingTransactions.splice(0, pendingTransactions.length);
  const pauseEventsToSend = pendingPauseEvents.splice(0, pendingPauseEvents.length);
  const checkpointTime = Date.now();
  const shouldWrite =
    options?.complete ||
    options?.force ||
    transactionsToSend.length > 0 ||
    pauseEventsToSend.length > 0 ||
    latestCode !== lastCheckpointCode;

  if (!shouldWrite) {
    return true;
  }

  const serverTaskId = await ensureTaskDraftExists();
  if (!serverTaskId) {
    pendingTransactions = [...transactionsToSend, ...pendingTransactions];
    pendingPauseEvents = [...pauseEventsToSend, ...pendingPauseEvents];
    return false;
  }

  setSyncState("syncing", null);

  try {
    const response = await fetch(`/api/evaluations/${state.evaluationId}/tasks/${serverTaskId}`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        latestCode,
        checkpointTime,
        transactions: transactionsToSend,
        pauseEvents: pauseEventsToSend,
        completed: options?.complete ?? false,
        finalCode,
        endTime: options?.endTime,
      }),
      keepalive: Boolean(options?.force || options?.complete),
    });

    if (!response.ok) {
      throw new Error(`Checkpoint request failed (${response.status})`);
    }

    lastCheckpointCode = latestCode;
    lastCheckpointTime = checkpointTime;
    setSyncState("idle", null);
    return true;
  } catch (error) {
    pendingTransactions = [...transactionsToSend, ...pendingTransactions];
    pendingPauseEvents = [...pauseEventsToSend, ...pendingPauseEvents];
    const message = parseErrorMessage(error, "Failed to sync task data.");
    setSyncState("error", message);
    console.error("Failed to sync task checkpoint:", error);
    return false;
  }
}

function queueCheckpointFlush(options?: {complete?: boolean; finalCode?: string; endTime?: number; force?: boolean}) {
  checkpointPromise = checkpointPromise.then(() => flushTaskCheckpoint(options));
  return checkpointPromise;
}

function scheduleCheckpoint({immediate = false}: {immediate?: boolean} = {}) {
  if (!state.active || !state.evaluationId || !state.currentTaskId || !state.currentTaskClientId) {
    return;
  }

  if (pendingTransactions.length >= MAX_PENDING_TRANSACTIONS) {
    immediate = true;
  }

  if (immediate) {
    clearCheckpointTimer();
    void queueCheckpointFlush();
    return;
  }

  if (checkpointTimer) {
    return;
  }

  checkpointTimer = setTimeout(() => {
    checkpointTimer = null;
    void queueCheckpointFlush();
  }, CHECKPOINT_INTERVAL_MS);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    clearCheckpointTimer();
    void queueCheckpointFlush({force: true});
  });
}

export const evaluationStore = {
  openStartDialog() {
    setState({showStartDialog: true});
  },

  closeStartDialog() {
    setState({showStartDialog: false});
  },

  closeTaskInputDialog() {
    setState({showTaskInputDialog: false});
  },

  exitToQuestionnaire() {
    setState({showTaskInputDialog: false, pendingQuestionnaire: true});
  },

  clearPendingQuestionnaire() {
    setState({pendingQuestionnaire: false});
  },

  async startEvaluation(name: string, id: number) {
    resetTaskSyncInternals();
    setSyncState("syncing", null);

    try {
      // Ensure task definitions are loaded from the database before proceeding.
      await loadTasks();

      const response = await fetch(`/api/evaluations`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({participantName: name, participantId: id}),
      });

      if (!response.ok) {
        throw new Error(`Session request failed (${response.status})`);
      }

      const data = await response.json();
      const evaluationId = typeof data.id === "string" ? data.id : null;
      if (!evaluationId) {
        throw new Error("Session response did not include an ID.");
      }

      if (data.resumed === true && data.session) {
        restoreEvaluationSession(data.session as EvaluationSession);
        return true;
      }

      sessionStartTime = Date.now();

      setState({
        active: true,
        evaluationId,
        participantName: name,
        participantId: id,
        showStartDialog: false,
        showTaskInputDialog: true,
        currentTaskId: null,
        currentTaskClientId: null,
        currentTaskIndex: 0,
        currentTaskStartTime: null,
        currentCode: null,
        paused: false,
        pausedElapsed: 0,
        totalPausedMs: 0,
        currentPauseStart: null,
        currentPauseEvents: [],
        currentTransactions: [],
        completedTasks: [],
        questionnaire: null,
        pendingQuestionnaire: false,
        syncStatus: "idle",
        syncError: null,
      });

      return true;
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to create the evaluation session.");
      setSyncState("error", message);
      console.error("Failed to create server evaluation session:", error);
      notifySyncFailure(`${message} The evaluation has not started.`);
      sessionStartTime = null;
      return false;
    }
  },

  setCurrentTask(taskId: string) {
    resetTaskSyncInternals();
    const clientTaskId = createClientTaskId();

    setState({
      currentTaskId: taskId,
      currentTaskClientId: clientTaskId,
      currentTaskStartTime: Date.now(),
      currentCode: null, // reset — will be populated once the editor loads
      pausedElapsed: 0,
      totalPausedMs: 0,
      currentPauseStart: null,
      currentPauseEvents: [],
      currentTransactions: [],
      showTaskInputDialog: false,
      paused: false,
      syncStatus: "idle",
      syncError: null,
    });

    void ensureTaskDraftExists();
  },

  /** Update the live editor content so it survives component unmount (e.g. docs navigation). */
  updateCurrentCode(code: string) {
    // Direct mutation to avoid triggering re-renders on every keystroke.
    // This is intentional — we only need this for persistence, not reactivity.
    state = {...state, currentCode: code};
    scheduleCheckpoint();
  },

  pauseEvaluation(reason: string) {
    if (state.paused || !state.active || !state.currentTaskId) return;

    const now = Date.now();
    // Accumulate elapsed time up to now
    const elapsedSinceLast = now - (state.currentTaskStartTime ?? now);
    const newPausedElapsed = state.pausedElapsed + elapsedSinceLast - state.totalPausedMs;

    const pauseEvent: PauseEvent = {
      pausedAt: now,
      resumedAt: null,
      reason,
    };

    setState({
      paused: true,
      pausedElapsed: newPausedElapsed,
      currentPauseStart: now,
      currentPauseEvents: [...state.currentPauseEvents, pauseEvent],
    });

    scheduleCheckpoint({immediate: true});
  },

  resumeEvaluation() {
    if (!state.paused || !state.active) return;

    const now = Date.now();
    const pauseDuration = now - (state.currentPauseStart ?? now);

    let closedPauseEvent: PauseEvent | null = null;
    const updatedPauseEvents = state.currentPauseEvents.map((event, index) => {
      if (index !== state.currentPauseEvents.length - 1) {
        return event;
      }

      closedPauseEvent = {...event, resumedAt: now};
      return closedPauseEvent;
    });

    if (closedPauseEvent) {
      pendingPauseEvents.push(closedPauseEvent);
    }

    setState({
      paused: false,
      totalPausedMs: state.totalPausedMs + pauseDuration,
      currentPauseStart: null,
      currentPauseEvents: updatedPauseEvents,
    });

    scheduleCheckpoint({immediate: true});
  },

  recordTransaction(data: TransactionRecord) {
    if (state.paused) return;
    state.currentTransactions.push(data);
    pendingTransactions.push(data);
    scheduleCheckpoint();
  },

  openCompleteDialog() {
    setState({showCompleteDialog: true});
  },

  closeCompleteDialog() {
    setState({showCompleteDialog: false});
  },

  async completeCurrentTask(finalCode: string) {
    if (!state.currentTaskId || state.currentTaskStartTime == null) {
      return false;
    }

    // If paused, resume first to close the pause event.
    if (state.paused) {
      this.resumeEvaluation();
    }

    clearCheckpointTimer();

    const task = getTaskById(state.currentTaskId);
    if (!task) {
      notifySyncFailure("The current task could not be found.");
      return false;
    }

    const completedAt = Date.now();
    const synced = await queueCheckpointFlush({
      complete: true,
      finalCode,
      endTime: completedAt,
      force: true,
    });

    if (!synced) {
      notifySyncFailure("Task data could not be synced. Please retry before continuing.");
      return false;
    }

    const completedTask: CompletedTask = {
      clientTaskId: state.currentTaskClientId ?? undefined,
      taskId: state.currentTaskId,
      difficulty: task.difficulty,
      status: "completed",
      startTime: state.currentTaskStartTime,
      endTime: completedAt,
      initialCode: task.code,
      finalCode,
      lastCheckpointTime: lastCheckpointTime ?? completedAt,
      transactions: [...state.currentTransactions],
      pauseEvents: [...state.currentPauseEvents],
    };

    const newCompletedTasks = [...state.completedTasks, completedTask];
    const newIndex = state.currentTaskIndex + 1;

    resetTaskSyncInternals();

    setState({
      completedTasks: newCompletedTasks,
      currentTaskId: null,
      currentTaskClientId: null,
      currentTaskIndex: newIndex,
      currentTaskStartTime: null,
      currentCode: null,
      pausedElapsed: 0,
      totalPausedMs: 0,
      currentPauseStart: null,
      currentPauseEvents: [],
      currentTransactions: [],
      showCompleteDialog: false,
      showTaskInputDialog: true,
      paused: false,
      syncStatus: "idle",
      syncError: null,
    });

    return true;
  },

  async submitQuestionnaire(questionnaire: QuestionnaireResponse) {
    setState({questionnaire});
    return this.endEvaluation(undefined, questionnaire);
  },

  async endEvaluation(tasksOverride?: CompletedTask[], questionnaireOverride?: QuestionnaireResponse) {
    const tasks = tasksOverride ?? state.completedTasks;
    const questionnaire = questionnaireOverride ?? state.questionnaire;

    const session: EvaluationSession = {
      participantName: state.participantName,
      participantId: state.participantId!,
      sessionStartTime: sessionStartTime!,
      sessionEndTime: Date.now(),
      tasks: [...tasks],
      questionnaire,
    };

    if (state.currentTaskId) {
      const synced = await queueCheckpointFlush({force: true});
      if (!synced) {
        notifySyncFailure("Current task data is not fully synced yet. Please try again.");
        return false;
      }
    }

    if (state.evaluationId) {
      setSyncState("syncing", null);

      try {
        const response = await fetch(`/api/evaluations/${state.evaluationId}`, {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            sessionEndTime: session.sessionEndTime,
            questionnaire,
          }),
          keepalive: true,
        });

        if (!response.ok) {
          throw new Error(`Finalize request failed (${response.status})`);
        }
      } catch (error) {
        const message = parseErrorMessage(error, "Failed to finalize the evaluation.");
        setSyncState("error", message);
        console.error("Failed to finalize evaluation on server:", error);
        notifySyncFailure(`${message} Please retry before closing the tab.`);
        return false;
      }
    }

    resetTaskSyncInternals();

    setState({
      active: false,
      evaluationId: null,
      participantName: "",
      participantId: null,
      showStartDialog: false,
      showTaskInputDialog: false,
      showCompleteDialog: false,
      paused: false,
      currentTaskId: null,
      currentTaskClientId: null,
      currentTaskIndex: 0,
      currentTaskStartTime: null,
      currentCode: null,
      pausedElapsed: 0,
      totalPausedMs: 0,
      currentPauseStart: null,
      currentPauseEvents: [],
      currentTransactions: [],
      completedTasks: [],
      questionnaire: null,
      pendingQuestionnaire: false,
      syncStatus: "idle",
      syncError: null,
    });

    sessionStartTime = null;
    return true;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): EvaluationState {
    return state;
  },

  getServerSnapshot(): EvaluationState {
    return state;
  },
};
