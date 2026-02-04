-- Add triage metadata to Exhibit
ALTER TABLE "public"."Exhibit" ADD COLUMN IF NOT EXISTS "triageJson" TEXT;
