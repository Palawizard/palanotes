# Palanotes

Quick note taking with automatic filing. Write freely (markdown or plain text), optionally add a hint about where it belongs ("file this with my networking classes"), then submit: Claude formats the note and files it in a folder, either as a new note or as a new section of an existing one. Full-text search finds notes even when they ended up in the wrong folder.

Served at `https://palawi.fr/notes`, sign-in with a palawi.fr account (Authentik).

## Requirements

- Node 22.12 or later
- pnpm 10.28 (`npm install -g pnpm@10.28.0`)
- Docker, for the development database

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

The app runs at `http://localhost:3000/notes`, and `http://localhost:3000/notes/api/health` returns `{"status":"ok"}`.

## Scripts

| Command                             | Purpose                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                          | web app and worker in development mode                      |
| `pnpm build`                        | production build of the web app                             |
| `pnpm typecheck`                    | type check every package                                    |
| `pnpm test`                         | Vitest tests                                                |
| `pnpm lint`                         | ESLint on the web app                                       |
| `pnpm format` / `pnpm format:check` | Prettier                                                    |
| `pnpm db:up` / `pnpm db:down`       | development Postgres (port 5434)                            |
| `pnpm db:generate`                  | new migration after a change to `packages/db/src/schema.ts` |
| `pnpm db:migrate`                   | apply migrations                                            |

## Layout

```
apps/web         Next.js: UI, HTTP routes, sign-in
apps/worker      background jobs (pg-boss): note filing
packages/core    framework-free domain logic
packages/db      Drizzle schema and migrations
packages/llm     model access, through a Claude subscription or an API key
docker/          development Postgres
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.
