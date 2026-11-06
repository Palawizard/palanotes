# Decisions

Durable technical decisions. A replaced decision is marked as such and kept.

## 2026-11-06: OIDC with openid-client and a signed cookie

Sign-in uses `openid-client` 6 (authorization code, PKCE S256, `state` and `nonce` checked) in Next.js route handlers, without Auth.js. After the callback the app keeps its own session: a JWT signed with HS256 (`jose`, `SESSION_SECRET`) in the `palawi_notes_session` cookie (`path=/notes`, `HttpOnly`, `Secure`, `SameSite=Lax`, 30 days). The PKCE verifier, `state`, `nonce` and return path travel in a second signed cookie limited to `/notes/api/auth` for 10 minutes. The token endpoint receives the configured redirect URI, never the internal request URL.

The proxy only checks the cookie signature; every page and route handler loads the account from the database before touching data.

Tests use `oauth2-mock-server`, which checks the PKCE verifier and copies the nonce into the ID token.

## 2026-11-06: workspace imports without file extensions

Packages export their TypeScript sources and import each other without extensions (`moduleResolution: Bundler`). Turbopack resolves workspace packages like `node_modules` and does not map `.js` imports to `.ts` files, so the earlier `.js` convention broke the web build. `tsx`, Vitest and Next.js all resolve extensionless imports.

## 2026-11-06: CSRF protection

State-changing requests must carry an `Origin` header equal to `PUBLIC_URL` (or `Sec-Fetch-Site: same-origin` when the browser sends no `Origin`), on top of `SameSite=Lax` cookies. The check runs in the proxy for every route.

## 2026-11-06: filing through the Claude Code CLI or the API

Subscription mode runs the official `claude` binary non-interactively with the owner's `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`). Anthropic's current legal page allows a subscriber to use the unmodified Claude Code binary with their own subscription and reserves API keys for products serving other people, so the subscription is limited to the owner's account in code (`resolveLlmMode`) and every other account goes through `ANTHROPIC_API_KEY` or is disabled.

The CLI gets no tools (`--tools ""`), no MCP servers, no settings or memory files, a private config directory, and no API key in its environment. Structured output is requested with `--json-schema`; because the CLI can end a successful run without `structured_output`, the worker falls back to the JSON in the text result, and Zod validation is the only gate either way.

The default model is `claude-haiku-5-5`: filing is a short classification and formatting task.

## 2026-11-06: failures are final until the user retries

A model error, a refusal or an invalid plan marks the entry `failed` with a short message and stores nothing in the notes. The queue only retries infrastructure errors (database, crash). Retrying a filing is a user action.

## 2026-11-06: undo through note snapshots

Every change a filing makes to a note writes a full snapshot in `note_versions` (folder, title, summary, tags, content), and the applied run records the ids it created or extended. Undo replays those snapshots instead of computing a reverse diff. It is refused when a touched note was modified after the filing, because restoring would silently drop that later change. An undone filing returns to review and can be accepted again.

## 2026-11-06: search with Postgres only

Search uses Postgres full-text search with an accent-insensitive French configuration plus `pg_trgm` word similarity for typos, matched word by word so one misspelled word does not hide a note and an unrelated word does not match everything. `unaccent` is not immutable, so the indexed columns are filled by a trigger rather than generated. No search engine or embeddings for the first version.

## 2026-11-06: end-to-end tests on a production build

Playwright starts `next build && next start` rather than `next dev`: the dev server's hot reload sometimes reloaded pages in a loop during long runs, and a production build is closer to what ships.

## 2026-11-06: production stack

One Compose stack on vm-apps: Postgres 17 (pinned by digest, internal network only), a one-shot `migrate` service, the worker (with the Claude Code CLI pinned at 2.1.318) and the web app (Next.js standalone), joined to the reverse proxy's external network. No published port. The worker image also carries the account maintenance command used by `purge-comptes-orphelins`. Backups are daily `pg_dump` archives with a freshness check.

## 2026-11-06: a three-pane explorer driven by the address

The explorer keeps everything that matters in the URL (folder, open note, order, page size), so a place can be reloaded, shared and opened in a new tab, and the server renders it without client state. Only the open folders of the tree live in the browser, in a cookie the server reads, which avoids a second render after loading. Lists never load note content, and long folders show 50 notes at a time.

## 2026-11-06: native drag and drop, with « Déplacer vers… » as the main path

Notes and folders are dragged with the browser's own drag and drop, without a library: drop targets are only the rows of the folder tree, which is simple enough to handle by hand. Native dragging is unreliable on touch screens and cannot be done from the keyboard, so every move also exists as « Déplacer vers… » with a filterable folder list (WCAG 2.2, 2.5.7). Folders are never deleted with their content: only an empty folder can be deleted, and merging moves every note before removing the emptied folder. (The deletion part is replaced by « deleted folders go to the trash for 30 days » below.)

## 2026-11-06: stricter typo matching

With a few hundred real notes, `word_similarity` at 0.4 matched pieces of longer words: « quokka » found 4 notes and « xylophone » 13. Search now uses `strict_word_similarity` (whole words) at the same threshold, and only for words of four letters or more. Measured on the demo account, the misspellings of the tests still match (« modle », « reseua », « algoritme », « dentsite ») while those two words match nothing.

## 2026-11-06: deleted folders go to the trash for 30 days

A folder can be deleted whatever it holds, after a confirmation that says how many notes and subfolders go with it. The folder, its subfolders, their notes and the history of each note are copied into one `trash_items` row (a JSON payload) in the same transaction that deletes them. The live tables never hold a deleted row, so no other query (lists, counts, search, the index sent to the model) needs a « not deleted » filter that could be forgotten. Restoring inserts the rows back with their ids and dates; the folder returns to its old parent if it still exists, otherwise to the top level, with a « (restauré) » suffix when the name is taken. The worker purges items older than 30 days every hour. Right after a deletion, « Annuler » in the status line and Ctrl+Z restore it.

## 2026-11-06: code colouring with highlight.js, guessed when untagged

Code blocks in notes are coloured by `rehype-highlight` (highlight.js through lowlight), not Shiki: highlight.js can guess the language of a fence that has none, which covers every note filed before the prompt asked for language tags, and its class-based output takes the app's own colour tokens in light and dark. Shiki is more exact but has no detection and weighs far more in the client bundle (the pocket renders Markdown in a client component). Guessing only picks among programming languages: with config formats in the set, short C# snippets came out as `ini`, and plain text lists as `yaml` or `css`. A tagged fence uses its language as is, and `text` turns colouring off. The filing prompt now asks the model to tag every fence in lowercase (`csharp`, `bash`, …) and to use `text` for anything that is not code.
