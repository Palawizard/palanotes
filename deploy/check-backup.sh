#!/usr/bin/env bash
# Exits 1 when the last successful backup is older than MAX_AGE_HOURS (default 26).
# Run it from cron with mail on failure, or from the monitoring host.
set -euo pipefail

backup_dir="${BACKUP_DIR:-/srv/backups/palanotes}"
max_age_hours="${MAX_AGE_HOURS:-26}"
marker="$backup_dir/last-success"

if [ ! -f "$marker" ]; then
  echo "no successful Palanotes backup recorded in $backup_dir" >&2
  exit 1
fi
age_hours=$(( ($(date +%s) - $(stat -c %Y "$marker")) / 3600 ))
if [ "$age_hours" -ge "$max_age_hours" ]; then
  echo "last Palanotes backup is ${age_hours} hours old" >&2
  exit 1
fi
echo "last Palanotes backup is ${age_hours} hours old"
