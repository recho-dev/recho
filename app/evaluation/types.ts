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

export type TaskPersistenceStatus = "in_progress" | "completed";

export type EvaluationSyncStatus = "idle" | "syncing" | "error";

export interface PauseEvent {
  pausedAt: number; // absolute timestamp
  resumedAt: number | null; // null if still paused
  reason: string; // pathname that triggered the pause, e.g. "/docs/api-echo"
}

export interface CompletedTask {
  clientTaskId?: string;
  taskId: string;
  difficulty: "easy" | "medium" | "hard";
  status?: TaskPersistenceStatus;
  startTime: number; // absolute timestamp
  endTime: number | null;
  initialCode: string;
  latestCode?: string;
  finalCode: string;
  lastCheckpointTime?: number | null;
  transactions: TransactionRecord[];
  pauseEvents: PauseEvent[];
}

export interface SUSResponse {
  items: number[]; // length 10, values 1-5
  score: number; // computed SUS score (0-100)
}

export interface NASATLXResponse {
  mentalDemand: number; // 0-100, step 5
  physicalDemand: number;
  temporalDemand: number;
  performance: number;
  effort: number;
  frustration: number;
}

export interface QuestionnaireResponse {
  sus: SUSResponse;
  nasaTlx: NASATLXResponse;
  submittedAt: number;
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
  currentTaskClientId: string | null;
  currentTaskIndex: number;
  currentTaskStartTime: number | null;
  currentCode: string | null; // live editor content, survives component unmount
  pausedElapsed: number;
  totalPausedMs: number;
  currentPauseStart: number | null;
  currentPauseEvents: PauseEvent[];
  currentTransactions: TransactionRecord[];
  completedTasks: CompletedTask[];
  questionnaire: QuestionnaireResponse | null;
  pendingQuestionnaire: boolean;
  syncStatus: EvaluationSyncStatus;
  syncError: string | null;
}

export interface EvaluationSession {
  id?: string;
  participantName: string;
  participantId: number;
  sessionStartTime: number;
  sessionEndTime: number | null;
  tasks: CompletedTask[];
  questionnaire: QuestionnaireResponse | null;
}

export interface TaskDefinition {
  id: string;
  title: string;
  summary: string;
  series: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  code: string;
}
