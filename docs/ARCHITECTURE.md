# Architecture

## Overview

```
browser ──HTTPS──> Cloudflare (palawi.fr) ──tunnel──> Caddy / gateway
  /notes/*  ──> web (Next.js, port 3000)
                  │  stores the raw entry and queues a job
                  ▼
               Postgres  <──  worker (pg-boss)
                                │  asks for a filing plan
                                ▼
                              packages/llm
                                ├─ subscription mode: `claude -p` (Claude Code CLI)
                                └─ api mode: Anthropic SDK with an API key
```

## Packages

| Package         | Contents                                                                                            | Depends on            |
| --------------- | --------------------------------------------------------------------------------------------------- | --------------------- |
| `packages/core` | domain types and rules: filing plan (Zod schema), folder paths                                      | zod                   |
| `packages/db`   | Drizzle schema, client, SQL migrations                                                              | drizzle-orm, postgres |
| `packages/llm`  | `LlmClient` interface, per-account mode selection, then both implementations                        | nothing yet           |
| `apps/web`      | pages, HTTP routes (`/api/...`), OIDC sign-in, search                                               | core, db, llm         |
| `apps/worker`   | `sort-entry` queue: builds the context, calls the model, stores the plan, applies it in direct mode | core, db, llm         |

The domain code in `packages/core` depends on neither Next.js nor pg-boss.

## Life of a note

1. The user submits their text: an `entries` row is created (status `pending`) and a `sort-entry` job is queued.
2. The worker sends the model the raw text and the user's index (folders, titles, summaries, tags) and gets back a plan (`SortPlan`): create a note in a folder, or add a section to an existing note.
3. The plan is validated with Zod and stored in `sort_runs`.
4. Depending on the account setting (`users.sort_mode`):
   - `review`: the plan is shown to the user, who accepts or rejects it;
   - `direct`: the plan is applied right away, with an undo button.
5. Applying a plan (`applySortRun`) runs in one transaction with the plan row locked: it creates missing folders, creates or extends notes, writes one `note_versions` snapshot per touched note (`created`, or `before_append` with the previous title, summary, tags and content) and records the ids in `sort_runs.applied`.
6. Undo (`undoSortRun`) deletes the notes the plan created, restores the extended notes from their snapshots, removes the folders it created when they are empty, and puts the entry back to review. It is refused when a touched note changed after the filing, so a manual edit is never lost.
7. From the pocket the user can also reject a proposal (the entry keeps its raw text, status `rejected`) or retry it (the pending proposal is set aside and the entry is queued again).

Filing never edits or deletes the raw entry, so a bad filing can always be redone.

## Model modes

`resolveLlmMode` (`packages/llm/src/mode.ts`) picks the mode for each account:

- the account whose OIDC `sub` equals `LLM_OWNER_SUBJECT` uses `LLM_OWNER_MODE` (`subscription` by default);
- every other account uses `LLM_DEFAULT_MODE` (`api` or `disabled`), never the subscription.

`createLlmClient` then builds the client for that mode:

- **subscription**: the Claude Code CLI, run as `claude -p --output-format json --json-schema <schema> --tools "" --strict-mcp-config --no-session-persistence` with the prompt on stdin. Its environment holds only `PATH`, a private config directory and `CLAUDE_CODE_OAUTH_TOKEN`; API keys are left out because the CLI would prefer them. The plan is read from `structured_output`, or from the text result when that field is missing.
- **api**: the Anthropic SDK, `messages.create` with `output_config.format` set to the same JSON Schema and `effort: low`.

The default model is `claude-haiku-5-5` (`LLM_MODEL` overrides it). The model has no tools: it can only return a plan.

### Prompt

The system prompt (`packages/llm/src/prompt.ts`) says the entry and the index are data, never instructions, except for a filing hint naming a place. The user prompt lists the folders, then one line per note (id, folder, title, summary, tags; never the note content), then the entry inside `<entry>` tags.

### Validation

The worker parses the answer with `parseSortPlan` (Zod), checks that every folder path is valid and that every `append` targets a note of the same account, and only then stores the plan in `sort_runs`. Anything else marks the entry `failed` with a short message for the user. Logs carry the entry id, the mode, the model and the token counts, never the note text or a credential.

## Explorer

`/dossiers` is a three-pane explorer: the folder tree, the notes of one folder (or the recent notes), and the open note.

- The tree lives in `app/(app)/dossiers/layout.tsx`, which Next keeps across navigation, so it keeps its scroll position and open folders. It follows the WAI-ARIA tree pattern (`components/folder-tree.tsx`) as a flat list of tree items with `aria-level`, so each item's accessible name is its visible text (name and count) and the full count is its description: one tab stop, arrows, Home and End, first-letter jump, Enter to open. Open folders are saved in the `palanotes_tree` cookie, so the server renders the tree as it was left.
- The list and the note are the page: `/dossiers/recents`, `/dossiers/<folder>`, with `?note=<id>` for the open note, `?tri=modifiee|creee|titre` for the order and `?n=` for the number of notes shown (50 at a time). Lists read note rows without their content (`listNoteRowsInFolder`, `listRecentNoteRows`); sorting is done in `@palanotes/core` (`sortNotes`, French collation, natural numbers).
- Counts: each folder shows its notes plus those of its subfolders (`folderTotals`), and the list header says how many are directly in the folder.
- On a phone the panes stack: folders, then a folder's notes, then one note, each with a back link and the folder path. Between 48 and 75rem the tree stays and the list gives way to the open note.

### Organising

- Folder actions (new subfolder, rename, move, merge, delete) open from a right click or Shift+F10 on a tree item, the `⋯` button of a tree row or of the list header. They live in `components/folder-actions.tsx`, which also shows a short status line read by screen readers after every change.
- Notes and folders can be dragged onto a folder of the tree (native HTML drag and drop); a folder dragged onto the tree header goes to the top level. On touch screens and with the keyboard, « Déplacer vers… » opens a dialog with a filterable folder list instead.
- Server side (`packages/db/src/repo/folders.ts`): `createFolder`, `moveFolder` (refuses the folder itself and its subfolders), `mergeFolder` (moves notes, writing a `note_versions` row for each, moves subfolders, merges subfolders of the same name, then removes the emptied source, in one transaction). Every query is filtered by the account. Routes: `POST /api/folders`, `PATCH` and `DELETE /api/folders/<id>`, `POST /api/folders/<id>/merge`.
- Deleting a folder sends it to the trash with everything it holds (`packages/db/src/repo/trash.ts`). `trashFolder` copies the folder, its subfolders, their notes and note history into one `trash_items` row, then deletes them, in one transaction; the live tables keep no deleted rows. `restoreTrashItem` puts everything back with the same ids (to the old parent if it still exists, else to the top level, with a « (restauré) » suffix on a name clash). Right after a deletion the status line offers « Annuler », also on Ctrl+Z outside text fields. `/dossiers/corbeille` lists the trash, restores an item, deletes one for good or empties it. A single note goes to the trash the same way (`trashNote`, « Supprimer » in the note header, no confirmation): the row keeps `kind = 'note'`, the note id and the path of its folder. Restoring it puts it back in that folder, or makes the old path again (`ensureFolderPath`) when the folder was deleted since. The worker purges items older than 30 days every hour (`purgeExpiredTrash`). Routes: `DELETE /api/notes/<id>`, `POST /api/trash/<id>/restore`, `DELETE /api/trash/<id>`, `DELETE /api/trash`.

## Search

The goal is to find a note even when it was filed in the wrong place, typed without accents, or misspelled. Search never writes an answer: it lists notes.

- A text search configuration `french_unaccent` (French stemming, accents removed) and a trigger keep two columns of `notes` up to date: `search` (`tsvector`: title weight A, summary and tags B, content C, GIN index) and `search_text` (lowercase text without accents, trigram GIN index).
- `searchNotes` (`packages/db/src/repo/search.ts`) keeps a note when the whole query matches the full-text index, or when every word of the query matches either the full-text index or, for typos, the strict word similarity of `pg_trgm` (threshold 0.4, words of four letters or more). Strict similarity compares whole words, so an unrelated word no longer matches a piece of a longer one (« xylophone » used to find « téléphone »). Results are ranked by full-text rank, then similarity, then date, and limited to the signed-in account.
- Filters narrow by folder (alone or with its subfolders), by tags (every chosen tag) and by period (last modified in the last 7 days, 30 days or 12 months). Without words, the filtered notes come newest first. The search page reads its state from the address (`q`, `dossier`, `sous=0`, `tag`, `periode`, `n`; `lib/search-url.ts`), shows the active filters as chips that remove them, and counts folders, tags and periods over the first 200 results to offer ways to narrow them.
- Excerpts come from `ts_headline` with control characters around matched words; the page turns them into `<mark>`, and also marks the words of a title or excerpt that are close to a misspelled query word. Each result is a card with its folder path, date and tags; on a wide screen, hovering or focusing it shows the beginning of the note. Opening a result keeps the search in `?depuis=`, so the note page offers « Retour aux résultats ».

Embedding search (pgvector) can be added later if this is not enough.

## Data

Tables: `users`, `folders` (tree through `parent_id`), `entries` (raw text), `notes`, `sort_runs` (model plans), `note_versions` (history), `trash_items` (deleted folders and notes, kept 30 days). Schema: `packages/db/src/schema.ts`.

## Sign-in

OIDC with Authentik (`https://auth.palawi.fr/application/o/palanotes/`), authorization code with PKCE, through `openid-client`:

- `GET /api/auth/login` stores the PKCE verifier, `state`, `nonce` and return path in a short-lived signed cookie, then redirects to Authentik;
- `GET /api/auth/callback` checks them, creates or updates the `users` row from the ID token `sub`, and sets the session cookie;
- `POST /api/auth/logout` clears the session.

Users are identified by their `sub` (`users.auth_subject`), never by their email. The session cookie `palawi_notes_session` is a signed JWT that belongs to the app only, with `path=/notes`, `Secure`, `HttpOnly` and `SameSite=Lax`. Access is limited to an Authentik group.

`src/proxy.ts` checks the cookie signature on every request (pages are redirected to sign-in, API routes answer 401) and refuses state-changing requests from another origin. Pages and route handlers then load the account from the database with `getCurrentUser()`; every query is filtered by that account.
