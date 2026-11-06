# Palanotes

Quick note taking with automatic filing. Write freely (markdown or plain text), optionally add a hint about where it belongs ("file this with my networking classes"), then submit: Claude formats the note and files it in a folder, either as a new note or as a new section of an existing one. Full-text search finds notes even when they ended up in the wrong folder.

Served at `https://palawi.fr/notes`, sign-in with a palawi.fr account (Authentik).

## Requirements

- Node 22.12 or later
- pnpm 10.28 (`npm install -g pnpm@10.28.0`)
- Docker, for the development database (or any Postgres 16+ on port 5434 with the `unaccent` and `pg_trgm` extensions)

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

The app runs at `http://localhost:3000/notes`, and `http://localhost:3000/notes/api/health` returns `{"status":"ok"}`.

Signing in needs an OIDC provider (see `.env.example`). To try the app with realistic content, sign in once, then run `pnpm db:demo --subject <your OIDC sub>` on an empty account. Without a Claude token or API key, set `LLM_FAKE=1` to file entries with a deterministic fake model while developing.

## Scripts

| Command                                | Purpose                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                             | web app and worker in development mode                                                                                                        |
| `pnpm build`                           | production build of the web app                                                                                                               |
| `pnpm typecheck`                       | type check every package                                                                                                                      |
| `pnpm test`                            | Vitest tests (unit, and integration on Postgres: `TEST_DATABASE_URL`, default `postgres://palanotes:palanotes@localhost:5434/palanotes_test`) |
| `pnpm e2e`                             | Playwright end-to-end tests (fake sign-in and fake model; needs the database `palanotes_e2e`)                                                 |
| `pnpm check:private`                   | refuse private working files in the repository                                                                                                |
| `pnpm lint`                            | ESLint on the web app                                                                                                                         |
| `pnpm format` / `pnpm format:check`    | Prettier                                                                                                                                      |
| `pnpm db:up` / `pnpm db:down`          | development Postgres (port 5434)                                                                                                              |
| `pnpm db:generate`                     | new migration after a change to `packages/db/src/schema.ts`                                                                                   |
| `pnpm db:migrate`                      | apply migrations                                                                                                                              |
| `pnpm db:demo --subject <sub>`         | load the demo account (about 50 folders, 345 notes over a year) into an empty account of a local database; refused in production              |
| `pnpm --filter @palanotes/web screens` | screenshots of every screen with the demo account, at 1440, 1280 and 390 px, light and dark (`SCREENS_DIR` sets the folder)                   |

## Layout

```
apps/web         Next.js: UI, HTTP routes, sign-in
apps/worker      background jobs (pg-boss): note filing
packages/core    framework-free domain logic
packages/db      Drizzle schema and migrations
packages/llm     model access, through a Claude subscription or an API key
docker/          development Postgres, production Dockerfiles
deploy/          backup scripts for the server
compose.yaml     production stack
```

Production: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.
