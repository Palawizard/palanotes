CREATE TYPE "public"."note_version_kind" AS ENUM('created', 'before_append', 'before_edit');--> statement-breakpoint
ALTER TYPE "public"."entry_status" ADD VALUE 'rejected';--> statement-breakpoint
ALTER TABLE "note_versions" ADD COLUMN "kind" "note_version_kind" DEFAULT 'before_edit' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_versions" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "note_versions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "note_versions" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "note_versions" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "sort_runs" ADD COLUMN "applied" jsonb;