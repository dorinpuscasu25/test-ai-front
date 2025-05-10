-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('TEXT_WITH_VOICE', 'VOICE_CALL');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'MIXED');

-- CreateEnum
CREATE TYPE "InterviewStage" AS ENUM ('SCREENING', 'TECHNICAL', 'MANAGER', 'FINAL', 'ONSITE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'SITUATIONAL', 'ICEBREAKER', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "container" TEXT,
    "name" TEXT,
    "profilePicture" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "darkMode" BOOLEAN NOT NULL DEFAULT true,
    "detailedFeedback" BOOLEAN NOT NULL DEFAULT true,
    "videoAnalysis" BOOLEAN NOT NULL DEFAULT true,
    "voiceAnalysis" BOOLEAN NOT NULL DEFAULT true,
    "languagePreference" TEXT NOT NULL DEFAULT 'english',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_types" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programming_languages" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_languages" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,

    CONSTRAINT "interview_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "level" "ExperienceLevel" NOT NULL,
    "jobTypeId" TEXT NOT NULL,
    "interviewLanguage" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "interviewType" "InterviewType" NOT NULL,
    "stage" "InterviewStage" NOT NULL,
    "jobDescription" TEXT,
    "cvUrl" TEXT,
    "userId" TEXT NOT NULL,
    "mode" "InterviewMode" NOT NULL DEFAULT 'TEXT_WITH_VOICE',
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "totalQuestions" INTEGER,
    "completedQuestions" INTEGER,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "difficulty" "QuestionDifficulty",
    "interviewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "textResponse" TEXT,
    "audioUrl" TEXT,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "contentAnalysis" JSONB,
    "voiceAnalysis" JSONB,
    "videoAnalysis" JSONB,
    "responseScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT[],
    "areasToImprove" TEXT[],
    "summary" TEXT NOT NULL,
    "contentScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "behaviorScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "clarityScore" DOUBLE PRECISION,
    "relevanceScore" DOUBLE PRECISION,
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_container_key" ON "users"("container");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "job_types_value_key" ON "job_types"("value");

-- CreateIndex
CREATE INDEX "job_types_value_idx" ON "job_types"("value");

-- CreateIndex
CREATE UNIQUE INDEX "programming_languages_value_key" ON "programming_languages"("value");

-- CreateIndex
CREATE INDEX "programming_languages_value_idx" ON "programming_languages"("value");

-- CreateIndex
CREATE INDEX "interview_languages_interviewId_idx" ON "interview_languages"("interviewId");

-- CreateIndex
CREATE INDEX "interview_languages_languageId_idx" ON "interview_languages"("languageId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_languages_interviewId_languageId_key" ON "interview_languages"("interviewId", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "countries_value_key" ON "countries"("value");

-- CreateIndex
CREATE INDEX "countries_value_idx" ON "countries"("value");

-- CreateIndex
CREATE INDEX "interviews_userId_idx" ON "interviews"("userId");

-- CreateIndex
CREATE INDEX "interviews_jobTypeId_idx" ON "interviews"("jobTypeId");

-- CreateIndex
CREATE INDEX "interviews_countryId_idx" ON "interviews"("countryId");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- CreateIndex
CREATE INDEX "interviews_level_idx" ON "interviews"("level");

-- CreateIndex
CREATE INDEX "interviews_interviewType_idx" ON "interviews"("interviewType");

-- CreateIndex
CREATE INDEX "interviews_stage_idx" ON "interviews"("stage");

-- CreateIndex
CREATE INDEX "questions_interviewId_idx" ON "questions"("interviewId");

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "questions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "responses_questionId_key" ON "responses"("questionId");

-- CreateIndex
CREATE INDEX "responses_interviewId_idx" ON "responses"("interviewId");

-- CreateIndex
CREATE INDEX "responses_questionId_idx" ON "responses"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_interviewId_key" ON "feedbacks"("interviewId");

-- CreateIndex
CREATE INDEX "feedbacks_interviewId_idx" ON "feedbacks"("interviewId");

-- CreateIndex
CREATE INDEX "feedbacks_userId_idx" ON "feedbacks"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_languages" ADD CONSTRAINT "interview_languages_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_languages" ADD CONSTRAINT "interview_languages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "programming_languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "job_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
