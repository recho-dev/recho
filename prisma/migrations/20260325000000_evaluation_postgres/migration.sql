-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "EvaluationSession" (
    "id" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantId" INTEGER NOT NULL,
    "sessionStartTime" TIMESTAMP(3) NOT NULL,
    "sessionEndTime" TIMESTAMP(3),
    "questionnaire" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletedTask" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientTaskId" TEXT NOT NULL,
    "studyTaskId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "initialCode" TEXT NOT NULL,
    "latestCode" TEXT,
    "finalCode" TEXT,
    "lastCheckpointTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompletedTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionRecord" (
    "id" TEXT NOT NULL,
    "completedTaskId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "docChanged" BOOLEAN NOT NULL,
    "userEvent" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "initDoc" TEXT,
    "selection" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PauseEvent" (
    "id" TEXT NOT NULL,
    "completedTaskId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL,
    "resumedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PauseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationSession_sessionStartTime_idx" ON "EvaluationSession"("sessionStartTime" DESC);

-- CreateIndex
CREATE INDEX "CompletedTask_sessionId_startTime_idx" ON "CompletedTask"("sessionId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "CompletedTask_sessionId_clientTaskId_key" ON "CompletedTask"("sessionId", "clientTaskId");

-- CreateIndex
CREATE INDEX "TransactionRecord_completedTaskId_index_idx" ON "TransactionRecord"("completedTaskId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionRecord_completedTaskId_index_key" ON "TransactionRecord"("completedTaskId", "index");

-- CreateIndex
CREATE INDEX "PauseEvent_completedTaskId_pausedAt_idx" ON "PauseEvent"("completedTaskId", "pausedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PauseEvent_completedTaskId_pausedAt_key" ON "PauseEvent"("completedTaskId", "pausedAt");

-- AddForeignKey
ALTER TABLE "CompletedTask" ADD CONSTRAINT "CompletedTask_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EvaluationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionRecord" ADD CONSTRAINT "TransactionRecord_completedTaskId_fkey" FOREIGN KEY ("completedTaskId") REFERENCES "CompletedTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PauseEvent" ADD CONSTRAINT "PauseEvent_completedTaskId_fkey" FOREIGN KEY ("completedTaskId") REFERENCES "CompletedTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
