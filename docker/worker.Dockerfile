# Worker (pg-boss, sort-entry) with the Claude Code CLI for subscription mode.
# The same image runs the database migrations and the account maintenance commands.
FROM node:22.23.4-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/llm/package.json packages/llm/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm --filter @palanotes/worker deploy --legacy --prod /out

FROM node:22.23.4-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d
ARG CLAUDE_CODE_VERSION=2.1.318
RUN npm install --global "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
  && npm cache clean --force \
  && mkdir -p /home/node/.claude-palanotes \
  && chown node:node /home/node/.claude-palanotes
ENV NODE_ENV=production \
  CLAUDE_CLI_CONFIG_DIR=/home/node/.claude-palanotes \
  DISABLE_AUTOUPDATER=1 \
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
  WORKER_HEARTBEAT_FILE=/tmp/worker-heartbeat
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const s=require('fs').statSync(process.env.WORKER_HEARTBEAT_FILE); process.exit(Date.now()-s.mtimeMs<120000?0:1)"
CMD ["node_modules/.bin/tsx", "src/index.ts"]
