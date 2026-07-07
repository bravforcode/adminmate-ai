#!/bin/bash
# Database backup script for AdminMate AI
# Run daily via cron: 0 2 * * * /path/to/backup-database.sh
#
# Usage: ./backup-database.sh
# Requires: SUPABASE_DB_URL environment variable

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/adminmate_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check for required tools
if ! command -v pg_dump &> /dev/null; then
    echo "ERROR: pg_dump not found. Install postgresql-client."
    exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "ERROR: SUPABASE_DB_URL not set."
    echo "Get it from: Supabase Dashboard → Settings → Database → Connection string → URI"
    exit 1
fi

echo "Starting backup at $(date)"

# Dump and compress
pg_dump "$SUPABASE_DB_URL" | gzip > "$BACKUP_FILE"

# Check result
if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup completed: $BACKUP_FILE ($SIZE)"
else
    echo "ERROR: Backup failed"
    exit 1
fi

# Clean up backups older than 30 days
find "$BACKUP_DIR" -name "adminmate_*.sql.gz" -mtime +30 -delete
echo "Old backups cleaned up"
