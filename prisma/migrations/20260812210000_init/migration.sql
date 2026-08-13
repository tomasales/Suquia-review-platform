-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('STORIES', 'FEED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT_FOR_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PieceReviewState" AS ENUM ('OK', 'NEEDS_CHANGES');

-- CreateEnum
CREATE TYPE "FeedbackSourceType" AS ENUM ('TOMI', 'DIRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackLevel" AS ENUM ('DELIVERY', 'PIECE');

-- CreateEnum
CREATE TYPE "SyncOperationStatus" AS ENUM ('PENDING', 'SYNCING', 'FAILED', 'SYNCED');

-- CreateEnum
CREATE TYPE "AIProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'FAILED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "DriveSyncStatus" AS ENUM ('CONNECTED', 'CHECKING', 'PROBLEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAiLearningSource" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "generatedTitle" TEXT NOT NULL,
    "type" "DeliveryType" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SENT_FOR_REVIEW',
    "generalNote" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "driveFolderId" TEXT,
    "driveManifestFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Piece" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "initialNote" TEXT,
    "reviewState" "PieceReviewState",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceVersion" (
    "id" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT,
    "driveFileId" TEXT,
    "driveFolderId" TEXT,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "pieceId" TEXT,
    "pieceVersionId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "sourceType" "FeedbackSourceType" NOT NULL,
    "level" "FeedbackLevel" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAttachment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT,
    "driveFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReply" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEvent" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT,
    "actorUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guideline" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT,
    "driveFileId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveSyncState" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "DriveSyncStatus" NOT NULL DEFAULT 'CHECKING',
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "SyncOperationStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedEntry" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "deletedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "manifestFileId" TEXT NOT NULL,
    "deletedEntriesFileId" TEXT,
    "restoreStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "sourceFeedbackId" TEXT NOT NULL,
    "sourceDeliveryId" TEXT NOT NULL,
    "sourcePieceId" TEXT,
    "sourceVersionId" TEXT,
    "rawFeedbackSnapshot" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inferredImportance" INTEGER,
    "recurrence" TEXT,
    "relatedEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visualReferenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" TEXT,
    "model" TEXT,
    "schemaVersion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "processedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProcessingJob" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "status" "AIProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "model" TEXT,
    "schemaVersion" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "costEstimateMetadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfiguration" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isAiLearningSource_idx" ON "User"("isAiLearningSource");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizedEmail_email_key" ON "AuthorizedEmail"("email");

-- CreateIndex
CREATE INDEX "AuthorizedEmail_active_idx" ON "AuthorizedEmail"("active");

-- CreateIndex
CREATE INDEX "AuthorizedEmail_invitedByUserId_idx" ON "AuthorizedEmail"("invitedByUserId");

-- CreateIndex
CREATE INDEX "Delivery_type_idx" ON "Delivery"("type");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "Delivery_submittedAt_idx" ON "Delivery"("submittedAt");

-- CreateIndex
CREATE INDEX "Delivery_createdByUserId_idx" ON "Delivery"("createdByUserId");

-- CreateIndex
CREATE INDEX "Delivery_deletedAt_idx" ON "Delivery"("deletedAt");

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt");

-- CreateIndex
CREATE INDEX "Piece_reviewState_idx" ON "Piece"("reviewState");

-- CreateIndex
CREATE INDEX "Piece_deliveryId_idx" ON "Piece"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "Piece_deliveryId_position_key" ON "Piece"("deliveryId", "position");

-- CreateIndex
CREATE INDEX "PieceVersion_uploadedAt_idx" ON "PieceVersion"("uploadedAt");

-- CreateIndex
CREATE INDEX "PieceVersion_uploadedByUserId_idx" ON "PieceVersion"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "PieceVersion_driveFileId_idx" ON "PieceVersion"("driveFileId");

-- CreateIndex
CREATE UNIQUE INDEX "PieceVersion_pieceId_versionNumber_key" ON "PieceVersion"("pieceId", "versionNumber");

-- CreateIndex
CREATE INDEX "Feedback_deliveryId_idx" ON "Feedback"("deliveryId");

-- CreateIndex
CREATE INDEX "Feedback_pieceId_idx" ON "Feedback"("pieceId");

-- CreateIndex
CREATE INDEX "Feedback_pieceVersionId_idx" ON "Feedback"("pieceVersionId");

-- CreateIndex
CREATE INDEX "Feedback_authorUserId_idx" ON "Feedback"("authorUserId");

-- CreateIndex
CREATE INDEX "Feedback_sourceType_idx" ON "Feedback"("sourceType");

-- CreateIndex
CREATE INDEX "Feedback_level_idx" ON "Feedback"("level");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_feedbackId_idx" ON "FeedbackAttachment"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_uploadedByUserId_idx" ON "FeedbackAttachment"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_driveFileId_idx" ON "FeedbackAttachment"("driveFileId");

-- CreateIndex
CREATE INDEX "ConversationReply_feedbackId_idx" ON "ConversationReply"("feedbackId");

-- CreateIndex
CREATE INDEX "ConversationReply_authorUserId_idx" ON "ConversationReply"("authorUserId");

-- CreateIndex
CREATE INDEX "ConversationReply_createdAt_idx" ON "ConversationReply"("createdAt");

-- CreateIndex
CREATE INDEX "JournalEvent_deliveryId_idx" ON "JournalEvent"("deliveryId");

-- CreateIndex
CREATE INDEX "JournalEvent_actorUserId_idx" ON "JournalEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "JournalEvent_eventType_idx" ON "JournalEvent"("eventType");

-- CreateIndex
CREATE INDEX "JournalEvent_entityType_entityId_idx" ON "JournalEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "JournalEvent_createdAt_idx" ON "JournalEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Guideline_title_idx" ON "Guideline"("title");

-- CreateIndex
CREATE INDEX "Guideline_type_idx" ON "Guideline"("type");

-- CreateIndex
CREATE INDEX "Guideline_active_idx" ON "Guideline"("active");

-- CreateIndex
CREATE INDEX "Guideline_uploadedByUserId_idx" ON "Guideline"("uploadedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DriveSyncState_key_key" ON "DriveSyncState"("key");

-- CreateIndex
CREATE INDEX "DriveSyncState_status_idx" ON "DriveSyncState"("status");

-- CreateIndex
CREATE INDEX "SyncOperation_status_idx" ON "SyncOperation"("status");

-- CreateIndex
CREATE INDEX "SyncOperation_type_idx" ON "SyncOperation"("type");

-- CreateIndex
CREATE INDEX "SyncOperation_deliveryId_idx" ON "SyncOperation"("deliveryId");

-- CreateIndex
CREATE INDEX "SyncOperation_createdByUserId_idx" ON "SyncOperation"("createdByUserId");

-- CreateIndex
CREATE INDEX "SyncOperation_createdAt_idx" ON "SyncOperation"("createdAt");

-- CreateIndex
CREATE INDEX "SyncOperation_entityType_entityId_idx" ON "SyncOperation"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedEntry_deliveryId_key" ON "DeletedEntry"("deliveryId");

-- CreateIndex
CREATE INDEX "DeletedEntry_deletedAt_idx" ON "DeletedEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "DeletedEntry_deletedByUserId_idx" ON "DeletedEntry"("deletedByUserId");

-- CreateIndex
CREATE INDEX "AIKnowledgeEntry_sourceDeliveryId_idx" ON "AIKnowledgeEntry"("sourceDeliveryId");

-- CreateIndex
CREATE INDEX "AIKnowledgeEntry_sourcePieceId_idx" ON "AIKnowledgeEntry"("sourcePieceId");

-- CreateIndex
CREATE INDEX "AIKnowledgeEntry_sourceVersionId_idx" ON "AIKnowledgeEntry"("sourceVersionId");

-- CreateIndex
CREATE INDEX "AIKnowledgeEntry_processedAt_idx" ON "AIKnowledgeEntry"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIKnowledgeEntry_sourceFeedbackId_schemaVersion_key" ON "AIKnowledgeEntry"("sourceFeedbackId", "schemaVersion");

-- CreateIndex
CREATE INDEX "AIProcessingJob_status_idx" ON "AIProcessingJob"("status");

-- CreateIndex
CREATE INDEX "AIProcessingJob_feedbackId_idx" ON "AIProcessingJob"("feedbackId");

-- CreateIndex
CREATE INDEX "AIProcessingJob_schemaVersion_idx" ON "AIProcessingJob"("schemaVersion");

-- CreateIndex
CREATE INDEX "AIProcessingJob_createdAt_idx" ON "AIProcessingJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIProcessingJob_feedbackId_schemaVersion_key" ON "AIProcessingJob"("feedbackId", "schemaVersion");

-- CreateIndex
CREATE INDEX "SystemConfiguration_updatedByUserId_idx" ON "SystemConfiguration"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "AuthorizedEmail" ADD CONSTRAINT "AuthorizedEmail_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceVersion" ADD CONSTRAINT "PieceVersion_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceVersion" ADD CONSTRAINT "PieceVersion_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_pieceVersionId_fkey" FOREIGN KEY ("pieceVersionId") REFERENCES "PieceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReply" ADD CONSTRAINT "ConversationReply_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReply" ADD CONSTRAINT "ConversationReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEvent" ADD CONSTRAINT "JournalEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEvent" ADD CONSTRAINT "JournalEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guideline" ADD CONSTRAINT "Guideline_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedEntry" ADD CONSTRAINT "DeletedEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedEntry" ADD CONSTRAINT "DeletedEntry_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIKnowledgeEntry" ADD CONSTRAINT "AIKnowledgeEntry_sourceFeedbackId_fkey" FOREIGN KEY ("sourceFeedbackId") REFERENCES "Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIKnowledgeEntry" ADD CONSTRAINT "AIKnowledgeEntry_sourceDeliveryId_fkey" FOREIGN KEY ("sourceDeliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIKnowledgeEntry" ADD CONSTRAINT "AIKnowledgeEntry_sourcePieceId_fkey" FOREIGN KEY ("sourcePieceId") REFERENCES "Piece"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIKnowledgeEntry" ADD CONSTRAINT "AIKnowledgeEntry_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "PieceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProcessingJob" ADD CONSTRAINT "AIProcessingJob_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemConfiguration" ADD CONSTRAINT "SystemConfiguration_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
