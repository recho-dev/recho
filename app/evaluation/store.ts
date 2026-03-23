import {getTaskById} from "./tasks.ts";
import {exportEvaluationData} from "./export.ts";
import type {
  EvaluationState,
  TransactionRecord,
  MouseSample,
  CompletedTask,
  EvaluationSession,
  PauseEvent,
} from "./types.ts";

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

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
  currentTaskIndex: 0,
  currentTaskStartTime: null,
  pausedElapsed: 0,
  totalPausedMs: 0,
  currentPauseStart: null,
  currentPauseEvents: [],
  currentTransactions: [],
  currentMouseEvents: [],
  completedTasks: [],
};

let sessionStartTime: number | null = null;

function setState(partial: Partial<EvaluationState>) {
  state = {...state, ...partial};
  emitChange();
}

export const evaluationStore = {
  openStartDialog() {
    setState({showStartDialog: true});
  },

  closeStartDialog() {
    setState({showStartDialog: false});
  },

  async startEvaluation(name: string, id: number) {
    sessionStartTime = Date.now();

    // Create server-side evaluation session
    let evaluationId: string | null = null;
    try {
      const res = await fetch(`/notebook/api/evaluations`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({participantName: name, participantId: id}),
      });
      const data = await res.json();
      evaluationId = data.id;
    } catch (e) {
      console.error("Failed to create server evaluation session:", e);
    }

    setState({
      active: true,
      evaluationId,
      participantName: name,
      participantId: id,
      showStartDialog: false,
      showTaskInputDialog: true,
      currentTaskIndex: 0,
      completedTasks: [],
    });
  },

  setCurrentTask(taskId: string) {
    setState({
      currentTaskId: taskId,
      currentTaskStartTime: Date.now(),
      pausedElapsed: 0,
      totalPausedMs: 0,
      currentPauseStart: null,
      currentPauseEvents: [],
      currentTransactions: [],
      currentMouseEvents: [],
      showTaskInputDialog: false,
      paused: false,
    });
  },

  pauseEvaluation(reason: string) {
    if (state.paused || !state.active || !state.currentTaskId) return;

    const now = Date.now();
    // Accumulate elapsed time up to now
    const elapsedSinceLast = now - (state.currentTaskStartTime ?? now);
    const newPausedElapsed =
      state.pausedElapsed + elapsedSinceLast - state.totalPausedMs;

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
  },

  resumeEvaluation() {
    if (!state.paused || !state.active) return;

    const now = Date.now();
    const pauseDuration = now - (state.currentPauseStart ?? now);

    // Close the latest pause event
    const updatedPauseEvents = state.currentPauseEvents.map((e, i) =>
      i === state.currentPauseEvents.length - 1
        ? {...e, resumedAt: now}
        : e,
    );

    setState({
      paused: false,
      totalPausedMs: state.totalPausedMs + pauseDuration,
      currentPauseStart: null,
      currentPauseEvents: updatedPauseEvents,
    });
  },

  recordTransaction(data: TransactionRecord) {
    if (state.paused) return;
    state.currentTransactions.push(data);
  },

  recordMouseEvent(data: MouseSample) {
    if (state.paused) return;
    state.currentMouseEvents.push(data);
  },

  openCompleteDialog() {
    setState({showCompleteDialog: true});
  },

  closeCompleteDialog() {
    setState({showCompleteDialog: false});
  },

  async completeCurrentTask(finalCode: string) {
    // If paused, resume first to close the pause event
    if (state.paused) {
      this.resumeEvaluation();
    }

    const task = getTaskById(state.currentTaskId!);
    const completedTask: CompletedTask = {
      taskId: state.currentTaskId!,
      difficulty: task!.difficulty,
      startTime: state.currentTaskStartTime!,
      endTime: Date.now(),
      initialCode: task!.code,
      finalCode,
      transactions: [...state.currentTransactions],
      mouseEvents: [...state.currentMouseEvents],
      pauseEvents: [...state.currentPauseEvents],
    };

    const newCompletedTasks = [...state.completedTasks, completedTask];
    const newIndex = state.currentTaskIndex + 1;

    // Persist task to server
    if (state.evaluationId) {
      try {
        await fetch(`/notebook/api/evaluations/${state.evaluationId}/tasks`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(completedTask),
        });
      } catch (e) {
        console.error("Failed to persist task to server:", e);
      }
    }

    if (newIndex >= 4) {
      // All tasks done
      await this.endEvaluation(newCompletedTasks);
    } else {
      setState({
        completedTasks: newCompletedTasks,
        currentTaskIndex: newIndex,
        currentTaskId: null,
        currentTaskStartTime: null,
        pausedElapsed: 0,
        totalPausedMs: 0,
        currentPauseStart: null,
        currentPauseEvents: [],
        currentTransactions: [],
        currentMouseEvents: [],
        showCompleteDialog: false,
        showTaskInputDialog: true,
        paused: false,
      });
    }
  },

  async endEvaluation(tasksOverride?: CompletedTask[]) {
    const tasks = tasksOverride ?? state.completedTasks;

    // If there's an in-progress task that hasn't been completed, include partial data
    // (This happens when clicking Exit mid-task)
    const allTasks = [...tasks];

    const session: EvaluationSession = {
      participantName: state.participantName,
      participantId: state.participantId!,
      sessionStartTime: sessionStartTime!,
      sessionEndTime: Date.now(),
      tasks: allTasks,
    };

    // Finalize on server
    if (state.evaluationId) {
      try {
        await fetch(`/notebook/api/evaluations/${state.evaluationId}`, {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({sessionEndTime: session.sessionEndTime}),
        });
      } catch (e) {
        console.error("Failed to finalize evaluation on server:", e);
      }
    }

    // Client-side backup download
    exportEvaluationData(session);

    // Reset state
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
      currentTaskIndex: 0,
      currentTaskStartTime: null,
      pausedElapsed: 0,
      totalPausedMs: 0,
      currentPauseStart: null,
      currentPauseEvents: [],
      currentTransactions: [],
      currentMouseEvents: [],
      completedTasks: [],
    });
    sessionStartTime = null;
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
