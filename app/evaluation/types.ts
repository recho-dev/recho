export interface ChangeRecord {
  from: number;
  to: number;
  insert: string;
}

export interface SelectionRange {
  from: number;
  to: number;
  anchor: number;
  head: number;
}

export interface TransactionRecord {
  index: number;
  timestamp: number; // ms since task start
  docChanged: boolean;
  changes: ChangeRecord[];
  annotations: Record<string, unknown>;
  selection: SelectionRange[];
}

export interface MouseSample {
  timestamp: number; // ms since task start
  x: number; // relative to editor container
  y: number;
}

export interface PauseEvent {
  pausedAt: number; // absolute timestamp
  resumedAt: number | null; // null if still paused
  reason: string; // pathname that triggered the pause, e.g. "/docs/api-echo"
}

export interface CompletedTask {
  taskId: string;
  difficulty: "easy" | "medium" | "hard";
  startTime: number; // absolute timestamp
  endTime: number;
  initialCode: string;
  finalCode: string;
  transactions: TransactionRecord[];
  mouseEvents: MouseSample[];
  pauseEvents: PauseEvent[];
}

export interface EvaluationState {
  active: boolean;
  evaluationId: string | null;
  participantName: string;
  participantId: number | null;
  showStartDialog: boolean;
  showTaskInputDialog: boolean;
  showCompleteDialog: boolean;
  paused: boolean;
  currentTaskId: string | null;
  currentTaskIndex: number;
  currentTaskStartTime: number | null;
  pausedElapsed: number; // accumulated elapsed before pause
  totalPausedMs: number; // total ms spent paused during current task
  currentPauseStart: number | null; // when the current pause began
  currentPauseEvents: PauseEvent[];
  currentTransactions: TransactionRecord[];
  currentMouseEvents: MouseSample[];
  completedTasks: CompletedTask[];
}

export interface EvaluationSession {
  participantName: string;
  participantId: number;
  sessionStartTime: number;
  sessionEndTime: number | null;
  tasks: CompletedTask[];
}

export interface TaskDefinition {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  code: string;
}
