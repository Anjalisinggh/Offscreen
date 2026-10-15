#!/usr/bin/env bash
# Nightly backup of the site's Postgres (the offscreen-db container) on the API server.
# Keeps 7 days in ~/backups/db. When BACKUP_R2_ACCESS_KEY_ID / BACKUP_R2_SECRET_ACCESS_KEY are in
# ~/apps/offscreen/.env.production (an R2 token for the offscreen-backups bucket), each backup is
# also uploaded there as db/<date>.dump; that bucket deletes them after 14 days.
#   crontab: 30 3 * * * bash ~/apps/offscreen/server/backup-db.sh >> ~/backups/db/backup.log 2>&1
# Restore: podman exec -i offscreen-db pg_restore -U offscreen -d offscreen --clean --if-exists < <file>
set -euo pipefail
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" # rootless podman, when run from cron
DIR=~/backups/db
FILE="$DIR/offscreen-$(date -u +%F).dump"
mkdir -p "$DIR"

podman exec offscreen-db pg_dump -U offscreen -Fc offscreen > "$FILE.part"
mv "$FILE.part" "$FILE"
find "$DIR" -name 'offscreen-*.dump' -mtime +7 -delete
echo "$(date -u +%FT%TZ) saved $FILE ($(stat -c %s "$FILE") bytes)"

cd "$(dirname "$0")/.."
set -a; . ./.env.production; set +a
if [ -n "${BACKUP_R2_ACCESS_KEY_ID:-}" ]; then
  node --input-type=module -e "
    import fs from 'fs';
    import { AwsClient } from 'aws4fetch';
    const r2 = new AwsClient({ accessKeyId: process.env.BACKUP_R2_ACCESS_KEY_ID, secretAccessKey: process.env.BACKUP_R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
    const res = await r2.fetch('https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com/offscreen-backups/db/' + process.argv[1], { method: 'PUT', body: fs.readFileSync(process.argv[2]) });
    console.log(new Date().toISOString(), 'uploaded to R2:', res.status);
    if (!res.ok) process.exit(1);
  " "$(date -u +%F).dump" "$FILE"
fi
