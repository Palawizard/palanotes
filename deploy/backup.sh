#!/usr/bin/env bash
# Daily dump of the Palanotes database, run by cron on vm-apps from the repository folder.
#   BACKUP_DIR       where dumps go (default /srv/backups/palanotes)
#   KEEP_DAYS        days of dumps to keep (default 14)
#   BACKUP_PING_URL  optional URL called after a successful dump (healthchecks, Uptime Kuma push)
set -euo pipefail

cd "$(dirname "$0")/.."
backup_dir="${BACKUP_DIR:-/srv/backups/palanotes}"
keep_days="${KEEP_DAYS:-14}"
mkdir -p "$backup_dir"

file="$backup_dir/palanotes-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T postgres pg_dump -U palanotes --no-owner --clean --if-exists palanotes \
  | gzip > "$file.partial"
gzip -t "$file.partial"
mv "$file.partial" "$file"

find "$backup_dir" -name 'palanotes-*.sql.gz' -mtime +"$keep_days" -delete
date -u +%Y-%m-%dT%H:%M:%SZ > "$backup_dir/last-success"

if [ -n "${BACKUP_PING_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 "$BACKUP_PING_URL" > /dev/null
fi
echo "backup written: $file"
