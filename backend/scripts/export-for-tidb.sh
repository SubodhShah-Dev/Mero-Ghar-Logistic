#!/usr/bin/env bash
# MeroGhar helper: export the local XAMPP MySQL database so it can be imported
# into a free, always-on MySQL-compatible cloud DB (TiDB Cloud Starter).
#
# Usage:
#   1) Start XAMPP MySQL:   sudo /opt/lampp/lampp startmysql
#   2) Run this script:     bash backend/scripts/export-for-tidb.sh
#   3) Import the generated dump in the TiDB Cloud console/CLI.
#
# Why: with SQLite on Render, demo data was wiped on every redeploy. Moving the
# DB to TiDB Cloud Starter (free, MySQL-compatible, always-on) keeps the schema
# and data intact across Render redeploys, and keeps your mysql2 code unchanged.

set -e

MYSQLDUMP="${MYSQLDUMP:-/opt/lampp/bin/mysqldump}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-meroghar_db}"
OUT="${OUT:-backend/meroghar-export.sql}"

if [ ! -x "$MYSQLDUMP" ]; then
	echo "mysqldump not found at $MYSQLDUMP (start XAMPP or set MYSQLDUMP)."
	exit 1
fi

mkdir -p "$(dirname "$OUT")"

"$MYSQLDUMP" \
	--host="$DB_HOST" \
	--user="$DB_USER" \
	--no-tablespaces \
	--skip-comments \
	--add-drop-table \
	--single-transaction \
	"$DB_NAME" > "$OUT"

echo "Exported $DB_NAME -> $OUT"
echo
echo "Next step — import into TiDB Cloud Starter:"
echo "  1. Create a free Starter cluster (5 GiB row + 50M RUs/mo, no credit card)."
echo "  2. Downloads -> CLI, paste:  mysql -h <HOST> -P 4000 -u <user>.root -p --ssl-mode=REQUIRED meroghar_db < $OUT"
echo "  3. Then add the TiDB host/port/user/password + DB_SSL=true to Render's env vars."