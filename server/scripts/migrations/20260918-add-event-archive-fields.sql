-- Migration: Add isArchived and archivedAt fields to events table
-- and archive events that concluded more than 7 days ago

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS "idx_events_archived_datetime" ON events ("isArchived", "dateTime");

-- Backfill: Automatically archive past events that started more than 7 days ago
UPDATE events 
SET "isArchived" = true, "archivedAt" = NOW()
WHERE "isArchived" = false AND "dateTime" < NOW() - INTERVAL '7 DAYS';
