# Deployment

How to run Palanotes on `vm-apps`, served at `https://palawi.fr/notes`. Follow the steps in order; each one ends with a check.

The stack (`compose.yaml`) has four services:

| Service    | Image                      | Role                                                       |
| ---------- | -------------------------- | ---------------------------------------------------------- |
| `postgres` | `postgres:17.11-bookworm`  | database, volume `postgres`, reachable only from the stack |
| `migrate`  | `palanotes-worker` (built) | applies the migrations, then exits; the app waits for it   |
| `worker`   | `palanotes-worker` (built) | files entries; contains the Claude Code CLI 2.1.318        |
| `web`      | `palanotes-web` (built)    | Next.js on port 3000, joined to the reverse proxy network  |

No port is published on the host. Images are pinned by version and digest; the Claude Code CLI version is the `CLAUDE_CODE_VERSION` build argument of `docker/worker.Dockerfile`.

## 1. Authentik provider and application

Create these in the Authentik admin interface (`https://auth.palawi.fr/if/admin/`).

### Provider

Applications > Providers > Create > **OAuth2/OpenID Provider**:

| Field                            | Value                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| Name                             | `palanotes`                                                  |
| Authorization flow               | the default explicit consent flow, or implicit consent       |
| Client type                      | Confidential                                                 |
| Redirect URIs / Origins          | `https://palawi.fr/notes/api/auth/callback`, mode **Strict** |
| Signing key                      | the default certificate (RS256)                              |
| Subject mode (advanced settings) | **Based on the User's hashed ID** (`hashed_user_id`)         |
| Include claims in id_token       | enabled (the app reads the display name from the ID token)   |
| Scopes                           | `openid`, `profile`                                          |

Copy the generated **Client ID** and **Client Secret**: they go into `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`.

Do not change the subject mode later: accounts are keyed on `sub`, so a new mode would create new, empty accounts.

### Application

Applications > Applications > Create:

| Field      | Value                     |
| ---------- | ------------------------- |
| Name       | `Notes`                   |
| Slug       | `palanotes`               |
| Provider   | `palanotes`               |
| Launch URL | `https://palawi.fr/notes` |

Then open the application, tab **Policy / Group / User Bindings** > Bind existing group > `palawi-notes`. Create the group first if needed and add your user to it. Only members of this group can sign in.

Check: `https://auth.palawi.fr/application/o/palanotes/.well-known/openid-configuration` answers, and its `issuer` field is exactly `https://auth.palawi.fr/application/o/palanotes/` (with the trailing slash).

## 2. Claude subscription token

On a computer where you can open a browser and Claude Code is installed:

```sh
claude setup-token
```

Sign in with your Claude account. The command prints a token valid for one year: it goes into `CLAUDE_CODE_OAUTH_TOKEN`. Add a reminder to renew it eleven months from now. Never share it: anything that holds it spends your subscription.

The subscription only ever serves your own account (`LLM_OWNER_SUBJECT`); every other account uses `ANTHROPIC_API_KEY` or is disabled (`LLM_DEFAULT_MODE`), whatever the configuration says.

## 3. Code and secrets on vm-apps

```sh
sudo mkdir -p /srv/palanotes && sudo chown "$USER" /srv/palanotes
git clone https://github.com/Palawizard/palanotes.git /srv/palanotes
cd /srv/palanotes
git checkout main
cp .env.example .env
cp .env.worker.example .env.worker
chmod 600 .env .env.worker
```

`.env.worker` holds the model credentials and is read by the worker only, so the internet-facing web container never holds them. Fill `.env`:

| Variable             | Production value                                                         |
| -------------------- | ------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`  | `openssl rand -hex 24` (hex only: it goes into a URL)                    |
| `PUBLIC_URL`         | `https://palawi.fr`                                                      |
| `BASE_PATH`          | `/notes`                                                                 |
| `SESSION_SECRET`     | `openssl rand -base64 48`                                                |
| `OIDC_ISSUER`        | `https://auth.palawi.fr/application/o/palanotes/`                        |
| `OIDC_CLIENT_ID`     | from step 1                                                              |
| `OIDC_CLIENT_SECRET` | from step 1                                                              |
| `OIDC_REDIRECT_URI`  | `https://palawi.fr/notes/api/auth/callback`                              |
| `LLM_OWNER_MODE`     | `subscription`                                                           |
| `LLM_OWNER_SUBJECT`  | empty for now, filled at step 6                                          |
| `LLM_DEFAULT_MODE`   | `disabled` (or `api` once testers arrive, with `ANTHROPIC_API_KEY`)      |
| `LLM_MODEL`          | empty (default `claude-haiku-5-5`)                                       |
| `LLM_FAKE`           | `0`                                                                      |
| `PROXY_NETWORK`      | name of the Docker network your reverse proxy uses (`docker network ls`) |

Fill `.env.worker`:

| Variable                  | Production value                                                           |
| ------------------------- | -------------------------------------------------------------------------- |
| `CLAUDE_CODE_OAUTH_TOKEN` | from step 2                                                                |
| `ANTHROPIC_API_KEY`       | empty until testers; set a monthly spending limit in the Anthropic console |

Leave `DATABASE_URL`, `CLAUDE_CLI_PATH` and `CLAUDE_CLI_CONFIG_DIR` out: `compose.yaml` and the worker image set them. Changing `SESSION_SECRET` signs everyone out.

## 4. Build and start

```sh
docker network inspect "$PROXY_NETWORK"   # must exist: it is the reverse proxy's network
docker compose build
docker compose up -d
docker compose ps
```

Check: `migrate` shows `Exited (0)`, `postgres`, `worker` and `web` show `healthy` after about a minute. `docker compose logs migrate` ends with `[db] migrations applied`, `docker compose logs worker` with `[worker] started`.

## 5. Route `palawi.fr/notes`

The app keeps the `/notes` prefix itself: forward the path unchanged, do not strip it. The proxy reaches the container as `palanotes-web:3000` on `$PROXY_NETWORK`.

With Caddy, inside the `palawi.fr` site block, before any catch-all:

```caddy
handle /notes* {
	reverse_proxy palanotes-web:3000
}
```

With the gateway, add a route with path prefix `/notes` (no rewrite) to `http://palanotes-web:3000`. Use whichever of the two currently serves `palawi.fr` paths; the infra documentation says which.

Check from outside: `curl -s https://palawi.fr/notes/api/health` returns `{"status":"ok"}`, and `https://palawi.fr/notes` sends you to Authentik.

## 6. First sign-in and owner account

Sign in at `https://palawi.fr/notes`. Then read your `sub`:

```sh
docker compose run --rm worker node_modules/.bin/tsx src/accounts.ts list
```

Put the first column of your line into `LLM_OWNER_SUBJECT` in `.env`, then `docker compose up -d worker`.

Check the token without filing a note:

```sh
docker compose exec worker sh -c 'env -u ANTHROPIC_API_KEY CLAUDE_CONFIG_DIR="$CLAUDE_CLI_CONFIG_DIR" claude -p "Réponds juste OK" --tools "" --max-turns 1'
```

It must print `OK`. A message about onboarding or login means the token is wrong or expired: create a new one (step 2). The worker needs outbound HTTPS to Anthropic; if vm-apps filters egress, allow it for this stack. Then write a short note in the app: the pocket shows « Rangement… », then « À valider » within a minute. If it shows « Échec », `docker compose logs worker` gives the reason (never the note text).

## 7. Backups

Daily dump with 14 days kept, from the repository folder:

```sh
sudo mkdir -p /srv/backups/palanotes && sudo chown "$USER" /srv/backups/palanotes
crontab -e
```

```cron
15 3 * * * cd /srv/palanotes && ./deploy/backup.sh >> /srv/backups/palanotes/backup.log 2>&1
0 9 * * * cd /srv/palanotes && ./deploy/check-backup.sh || echo "Palanotes backup late" | mail -s "Palanotes backup" you@palawi.fr
```

`deploy/backup.sh` writes `palanotes-YYYYMMDD-HHMMSS.sql.gz`, checks the archive, deletes dumps older than `KEEP_DAYS` and records `last-success`. Set `BACKUP_PING_URL` to a push URL of your monitoring (Uptime Kuma push monitor or healthchecks) to be alerted when a run is missed; `deploy/check-backup.sh` fails when the last success is older than 26 hours, for a mail or monitor check instead. Include `/srv/backups/palanotes` in the off-site backup of vm-apps.

Restore into the running stack (replaces the current data):

```sh
gunzip -c /srv/backups/palanotes/palanotes-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose exec -T postgres psql -U palanotes -d palanotes
```

## 8. Monitoring and Homepage

- Uptime monitor (HTTP): `https://palawi.fr/notes/api/health`, expect status 200 and `"ok"`. It answers 503 when the database is down.
- Container health: `web` checks that health route, `worker` checks that its heartbeat file was written in the last two minutes (it writes only when the database answers).
- Homepage: a service entry named « Notes », link `https://palawi.fr/notes`, with the site monitor on the health URL.

## 9. Orphan accounts (`purge-comptes-orphelins`)

The app cannot see Authentik deletions. List the accounts it knows, with notes count and last activity:

```sh
docker compose run --rm worker node_modules/.bin/tsx src/accounts.ts list
```

Delete one by its OIDC `sub` (all its folders, notes, entries and history go with it):

```sh
docker compose run --rm worker node_modules/.bin/tsx src/accounts.ts delete <sub>
```

In `purge-comptes-orphelins`, add Palanotes to the apps it checks: compare the first column of `list` with the `sub` values of the `palanotes` provider's users in Authentik (with `hashed_user_id`, the `sub` is the user's hashed id), and call `delete` for each one Authentik no longer has.

## 10. Updates

```sh
cd /srv/palanotes
./deploy/backup.sh
git pull
docker compose build
docker compose up -d
```

`migrate` applies new migrations before `web` and `worker` start again. To pin a release, set `PALANOTES_TAG` to the version and check out its tag.

## 11. Infra documentation to update

In the « Infra Palawi » documentation: the new stack on vm-apps (`/srv/palanotes`, services and memory limits), the `/notes` route, the Authentik provider and group `palawi-notes`, the backup cron and its folder, the uptime monitor, the Homepage entry, the subscription token's renewal date, and the addition to `purge-comptes-orphelins`.
