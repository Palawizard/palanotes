CREATE TABLE "trash_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"path" text[] NOT NULL,
	"note_count" integer NOT NULL,
	"folder_count" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trash_items" ADD CONSTRAINT "trash_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trash_items_user_deleted_idx" ON "trash_items" USING btree ("user_id","deleted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trash_items_deleted_idx" ON "trash_items" USING btree ("deleted_at");