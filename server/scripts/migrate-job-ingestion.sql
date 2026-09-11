-- Migration: Job Ingestion Engine (job_company_sources table and job_listings schema extensions)
-- Run with psql or via database deployment

ALTER TABLE "job_listings"
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(64) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "externalUrl" VARCHAR(1024),
  ADD COLUMN IF NOT EXISTS "fingerprint" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "region" VARCHAR(64) DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS "rawMetadata" JSONB;

-- Widen location and title to accommodate detailed ATS listings without truncation
ALTER TABLE "job_listings" 
  ALTER COLUMN "location" TYPE VARCHAR(1024),
  ALTER COLUMN "title" TYPE VARCHAR(512);

-- Composite index on source and externalId for idempotent ATS updates
CREATE UNIQUE INDEX IF NOT EXISTS "idx_job_listings_source_external_id" 
  ON "job_listings" ("source", "externalId") 
  WHERE "externalId" IS NOT NULL;

-- Fingerprint index for cross-source deduplication
CREATE INDEX IF NOT EXISTS "idx_job_listings_fingerprint" 
  ON "job_listings" ("fingerprint") 
  WHERE "fingerprint" IS NOT NULL;

-- Table to manage harvest sources (Greenhouse company board tokens, etc.)
CREATE TABLE IF NOT EXISTS "job_company_sources" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adapter" VARCHAR(64) NOT NULL DEFAULT 'greenhouse',
  "companyName" VARCHAR(255) NOT NULL,
  "boardToken" VARCHAR(255) NOT NULL,
  "websiteUrl" VARCHAR(512),
  "targetRegions" TEXT[] DEFAULT ARRAY['US', 'Africa']::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastHarvestedAt" TIMESTAMP WITH TIME ZONE,
  "lastJobCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastErrorMessage" TEXT,
  "submittedById" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_job_company_sources_adapter_token" 
  ON "job_company_sources" ("adapter", "boardToken");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tatt_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_company_sources TO tatt_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_listings TO tatt_user;
  END IF;
END;
$$;
