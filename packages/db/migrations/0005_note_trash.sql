CREATE TYPE "public"."trash_kind" AS ENUM('folder', 'note');--> statement-breakpoint
ALTER TABLE "trash_items" ADD COLUMN "kind" "trash_kind" DEFAULT 'folder' NOT NULL;--> statement-breakpoint
ALTER TABLE "trash_items" ADD COLUMN "note_id" uuid;