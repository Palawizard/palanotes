-- Search setup, written by hand above the generated statements.
-- unaccent and pg_trgm are trusted extensions: the database owner can create them.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION public.french_unaccent (COPY = pg_catalog.french);--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH public.unaccent, pg_catalog.french_stem;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "search" "tsvector";--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "search_text" text;--> statement-breakpoint
CREATE INDEX "folders_parent_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "note_versions_sort_run_idx" ON "note_versions" USING btree ("sort_run_id");--> statement-breakpoint
CREATE INDEX "notes_folder_idx" ON "notes" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "notes_search_idx" ON "notes" USING gin ("search");--> statement-breakpoint
CREATE INDEX "notes_search_text_trgm_idx" ON "notes" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "sort_runs_user_idx" ON "sort_runs" USING btree ("user_id");
--> statement-breakpoint
-- unaccent() is not immutable, so the columns are kept up to date by a trigger rather than
-- generated. Title weighs most, then summary and tags, then the content.
CREATE FUNCTION public.notes_search_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search :=
    setweight(to_tsvector('public.french_unaccent', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('public.french_unaccent',
      coalesce(NEW.summary, '') || ' ' || array_to_string(NEW.tags, ' ')), 'B') ||
    setweight(to_tsvector('public.french_unaccent', coalesce(NEW.content, '')), 'C');
  NEW.search_text := lower(public.unaccent(
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.summary, '') || ' ' ||
    array_to_string(NEW.tags, ' ') || ' ' || coalesce(NEW.content, '')));
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER notes_search_update BEFORE INSERT OR UPDATE OF title, summary, tags, content ON notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_search_update();--> statement-breakpoint
UPDATE notes SET title = title;
