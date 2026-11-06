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

| Package | Contents | Depends on |
|---|---|---|
| `packages/core` | domain types and rules: filing plan (Zod schema), folder paths | zod |
| `packages/db` | Drizzle schema, client, SQL migrations | drizzle-orm, postgres |
| `packages/llm` | `LlmClient` interface, per-account mode selection, then both implementations | nothing yet |
| `apps/web` | pages, HTTP routes (`/api/...`), OIDC sign-in, search | core, db, llm |
| `apps/worker` | `sort-entry` queue: builds the context, calls the model, stores the plan, applies it in direct mode | core, db, llm |

The domain code in `packages/core` depends on neither Next.js nor pg-boss.

## Life of a note

1. The user submits their text: an `entries` row is created (status `pending`) and a `sort-entry` job is queued.
2. The worker sends the model the raw text and the user's index (folders, titles, summaries, tags) and gets back a plan (`SortPlan`): create a note in a folder, or add a section to an existing note.
3. The plan is validated with Zod and stored in `sort_runs`.
4. Depending on the account setting (`users.sort_mode`):
   - `review`: the plan is shown to the user, who accepts or rejects it;
   - `direct`: the plan is applied right away, with an undo button.
5. Applying a plan creates missing folders, creates or extends notes, and writes one `note_versions` row per change. Undo restores the previous versions and marks the plan `undone`.

Filing never edits or deletes the raw entry, so a bad filing can always be redone.

## Model modes

`resolveLlmMode` (`packages/llm/src/mode.ts`) picks the mode for each account:

- the account whose OIDC `sub` equals `LLM_OWNER_SUBJECT` uses `LLM_OWNER_MODE` (`subscription` by default);
- every other account uses `LLM_DEFAULT_MODE` (`api` or `disabled`), never the subscription.

Subscription mode runs the Claude Code CLI non-interactively with `CLAUDE_CODE_OAUTH_TOKEN`; api mode uses `ANTHROPIC_API_KEY`. Each plan records the mode, the model and the tokens used.

## Search

The goal is to find a note even when it was filed in the wrong place. Each note gets a title, a summary and tags at filing time; Postgres full-text search (`french` configuration, `unaccent`, `pg_trgm` for typos) covers the title, summary, tags and content. Every result shows its folder path. Embedding search (pgvector) can be added later if full-text search is not enough.

## Data

Tables: `users`, `folders` (tree through `parent_id`), `entries` (raw text), `notes`, `sort_runs` (model plans), `note_versions` (history). Schema: `packages/db/src/schema.ts`.

## Sign-in

OIDC with Authentik (`https://auth.palawi.fr/application/o/palanotes/`), authorization code with PKCE. Users are identified by their `sub` (`users.auth_subject`), never by their email. The session cookie belongs to the app only, with `path=/notes`, `Secure`, `HttpOnly` and `SameSite=Lax`. Access is limited to an Authentik group.
