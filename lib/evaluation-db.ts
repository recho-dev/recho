import {Prisma, TaskStatus} from "@prisma/client";
import type {ChangeRecord, PauseEvent, SelectionRange, TransactionRecord} from "../app/evaluation/types.ts";

type JsonArray<T> = T[];

type SessionSummaryRecord = {
  id: string;
  participantName: string;
  participantId: number;
  sessionStartTime: Date;
  sessionEndTime: Date | null;
  questionnaire: Prisma.JsonValue | null;
  _count: {tasks: number};
};

export const evaluationSessionWithRelations = Prisma.validator<Prisma.EvaluationSessionDefaultArgs>()({
  include: {
    tasks: {
      orderBy: {
        startTime: "asc",
      },
      include: {
        transactions: {
          orderBy: {
            index: "asc",
          },
        },
        pauseEvents: {
          orderBy: {
            pausedAt: "asc",
          },
        },
      },
    },
  },
});

type SessionWithRelations = Prisma.EvaluationSessionGetPayload<typeof evaluationSessionWithRelations>;

export type CreateTaskDraftInput = {
  clientTaskId: string;
  taskId: string;
  difficulty: string;
  startTime: number;
  initialCode: string;
  latestCode?: string;
};

export type TaskCheckpointInput = {
  latestCode?: string;
  checkpointTime?: number;
  transactions?: TransactionRecord[];
  pauseEvents?: PauseEvent[];
  completed?: boolean;
  finalCode?: string;
  endTime?: number;
};

type ImportSession = {
  id?: string;
  participantName: string;
  participantId: number;
  sessionStartTime: number;
  sessionEndTime: number | null;
  questionnaire?: Prisma.JsonValue | null;
  tasks?: Array<{
    clientTaskId?: string;
    taskId: string;
    difficulty: string;
    status?: string;
    startTime: number;
    endTime?: number | null;
    initialCode: string;
    finalCode?: string;
    latestCode?: string;
    lastCheckpointTime?: number | null;
    transactions?: TransactionRecord[];
    pauseEvents?: PauseEvent[];
  }>;
};

function toDate(value: number | null | undefined) {
  return value == null ? null : new Date(value);
}

function toMillis(value: Date | null | undefined) {
  return value == null ? null : value.getTime();
}

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asNullableJsonInput(value: Prisma.JsonValue | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.DbNull;
  }

  return value as Prisma.InputJsonValue;
}

function jsonArrayOr<T>(value: Prisma.JsonValue | null | undefined, fallback: T[]): JsonArray<T> {
  return Array.isArray(value) ? (value as JsonArray<T>) : fallback;
}

function extractTransactionAnnotations(record: TransactionRecord) {
  const annotations = record.annotations ?? {};
  const userEvent = typeof annotations.userEvent === "string" ? annotations.userEvent : null;
  const remote = annotations.remote === true;
  const initDoc =
    annotations.type === "init" && typeof annotations.doc === "string"
      ? annotations.doc
      : null;

  return {userEvent, remote, initDoc};
}

function clientStatusFromDb(status: TaskStatus) {
  return status === TaskStatus.COMPLETED ? "completed" : "in_progress";
}

function dbStatusFromClient(status: string | undefined, endTime: number | null | undefined) {
  if (status === "in_progress") return TaskStatus.IN_PROGRESS;
  if (status === "completed") return TaskStatus.COMPLETED;
  return endTime == null ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED;
}

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export function serializeEvaluationSummary(session: SessionSummaryRecord) {
  return {
    id: session.id,
    participantName: session.participantName,
    participantId: session.participantId,
    sessionStartTime: session.sessionStartTime.getTime(),
    sessionEndTime: toMillis(session.sessionEndTime),
    taskCount: session._count.tasks,
    hasQuestionnaire: Boolean(session.questionnaire),
  };
}

export function serializeEvaluationSession(session: SessionWithRelations) {
  return {
    id: session.id,
    participantName: session.participantName,
    participantId: session.participantId,
    sessionStartTime: session.sessionStartTime.getTime(),
    sessionEndTime: toMillis(session.sessionEndTime),
    questionnaire: session.questionnaire,
    tasks: session.tasks.map((task) => ({
      clientTaskId: task.clientTaskId,
      taskId: task.studyTaskId,
      difficulty: task.difficulty,
      status: clientStatusFromDb(task.status),
      startTime: task.startTime.getTime(),
      endTime: toMillis(task.endTime),
      initialCode: task.initialCode,
      latestCode: task.latestCode ?? task.finalCode ?? task.initialCode,
      finalCode: task.finalCode ?? task.latestCode ?? task.initialCode,
      lastCheckpointTime: toMillis(task.lastCheckpointTime),
      transactions: task.transactions.map((transaction) => {
        const annotations: Record<string, unknown> = {};
        if (transaction.userEvent != null) {
          annotations.userEvent = transaction.userEvent;
        }
        if (transaction.remote) {
          annotations.remote = true;
        }
        if (transaction.initDoc != null) {
          annotations.type = "init";
          annotations.doc = transaction.initDoc;
        }

        return {
          index: transaction.index,
          timestamp: transaction.timestampMs,
          docChanged: transaction.docChanged,
          changes: jsonArrayOr<ChangeRecord>(transaction.changes, []),
          annotations,
          selection: jsonArrayOr<SelectionRange>(transaction.selection, []),
        };
      }),
      pauseEvents: task.pauseEvents.map((pauseEvent) => ({
        pausedAt: pauseEvent.pausedAt.getTime(),
        resumedAt: toMillis(pauseEvent.resumedAt),
        reason: pauseEvent.reason,
      })),
    })),
  };
}

export function buildTaskDraftCreateInput(sessionId: string, task: CreateTaskDraftInput) {
  return {
    sessionId,
    clientTaskId: task.clientTaskId,
    studyTaskId: task.taskId,
    difficulty: task.difficulty,
    startTime: new Date(task.startTime),
    initialCode: task.initialCode,
    latestCode: task.latestCode ?? task.initialCode,
    lastCheckpointTime: new Date(task.startTime),
    status: TaskStatus.IN_PROGRESS,
  } satisfies Prisma.CompletedTaskUncheckedCreateInput;
}

export function buildTransactionBatch(completedTaskId: string, records: TransactionRecord[]) {
  return records.map((record) => {
    const {userEvent, remote, initDoc} = extractTransactionAnnotations(record);

    return {
      completedTaskId,
      index: record.index,
      timestampMs: record.timestamp,
      docChanged: record.docChanged,
      userEvent,
      remote,
      initDoc,
      selection: asInputJson(record.selection ?? []),
      changes: asInputJson(record.changes ?? []),
    } satisfies Prisma.TransactionRecordCreateManyInput;
  });
}

export function buildImportedTransactionBatch(completedTaskId: string, records: TransactionRecord[]) {
  return records.map((record, index) => {
    const {userEvent, remote, initDoc} = extractTransactionAnnotations(record);

    return {
      completedTaskId,
      index,
      timestampMs: record.timestamp,
      docChanged: record.docChanged,
      userEvent,
      remote,
      initDoc,
      selection: asInputJson(record.selection ?? []),
      changes: asInputJson(record.changes ?? []),
    } satisfies Prisma.TransactionRecordCreateManyInput;
  });
}

export function buildPauseEventBatch(completedTaskId: string, pauseEvents: PauseEvent[]) {
  return pauseEvents.map((pauseEvent) => ({
    completedTaskId,
    pausedAt: new Date(pauseEvent.pausedAt),
    resumedAt: toDate(pauseEvent.resumedAt),
    reason: pauseEvent.reason,
  })) satisfies Prisma.PauseEventCreateManyInput[];
}

export function buildTaskCheckpointUpdate(input: TaskCheckpointInput) {
  const data: Prisma.CompletedTaskUncheckedUpdateInput = {};

  if (typeof input.latestCode === "string") {
    data.latestCode = input.latestCode;
  }
  if (input.checkpointTime != null) {
    data.lastCheckpointTime = new Date(input.checkpointTime);
  }
  if (input.completed) {
    data.status = TaskStatus.COMPLETED;
    data.endTime = toDate(input.endTime) ?? new Date();
    data.finalCode = input.finalCode ?? input.latestCode ?? "";
    data.latestCode = input.finalCode ?? input.latestCode ?? "";
    data.lastCheckpointTime = toDate(input.endTime) ?? toDate(input.checkpointTime) ?? new Date();
  }

  return data;
}

export function normalizeImportSessions(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as ImportSession[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    "sessions" in payload &&
    Array.isArray((payload as {sessions?: unknown}).sessions)
  ) {
    return (payload as {sessions: ImportSession[]}).sessions;
  }
  if (payload && typeof payload === "object") {
    return [payload as ImportSession];
  }
  throw new Error("Expected a JSON array of evaluation sessions.");
}

export function buildImportedSessionCreateInput(session: ImportSession) {
  return {
    id: session.id ?? crypto.randomUUID(),
    participantName: session.participantName,
    participantId: session.participantId,
    sessionStartTime: new Date(session.sessionStartTime),
    sessionEndTime: toDate(session.sessionEndTime),
    questionnaire: asNullableJsonInput(session.questionnaire),
  } satisfies Prisma.EvaluationSessionCreateInput;
}

export function buildImportedTaskCreateInput(sessionId: string, task: NonNullable<ImportSession["tasks"]>[number]) {
  const status = dbStatusFromClient(task.status, task.endTime);
  const latestCode = task.latestCode ?? task.finalCode ?? task.initialCode;

  return {
    sessionId,
    clientTaskId: task.clientTaskId ?? crypto.randomUUID(),
    studyTaskId: task.taskId,
    difficulty: task.difficulty,
    status,
    startTime: new Date(task.startTime),
    endTime: toDate(task.endTime),
    initialCode: task.initialCode,
    latestCode,
    finalCode: status === TaskStatus.COMPLETED ? task.finalCode ?? latestCode : null,
    lastCheckpointTime: toDate(task.lastCheckpointTime ?? task.endTime ?? task.startTime),
  } satisfies Prisma.CompletedTaskUncheckedCreateInput;
}
