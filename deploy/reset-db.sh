#!/usr/bin/env bash
# Rebuild the demo database from docs/setup_db.sql.
#
# Used for the first data load and by the nightly cron job, so that edits and
# deletes made by demo visitors do not pile up.
#
# --single-transaction: the DROP / CREATE / COPY run as one transaction, so a
# failure leaves the old data in place, and readers keep seeing the old data
# until the new data is committed.
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose exec -T -w /docs db \
  psql -U postgres -d worldcup -v ON_ERROR_STOP=1 --single-transaction \
  -f setup_db.sql

echo "$(date -u +%FT%TZ) database reset done"
