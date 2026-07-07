# Release 26D.5 — Backup Policy

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** Platform Engineering & SRE

## Overview

Define and implement backup policies with clear RPO/RTO targets, documented backup/restore procedures, and retention schedules for all AdminMate AI data stores.

## Objectives

- All data stores backed up on defined schedule
- RPO and RTO targets documented and achievable
- Backup integrity verified through automated checks
- Restore procedures documented and tested
- Retention policies aligned with compliance requirements

## RPO/RTO Targets

### Target Matrix

| Data Store | RPO | RTO | Backup Frequency | Retention |
|------------|-----|-----|------------------|-----------|
| PostgreSQL (primary) | 1 hour | 4 hours | Continuous WAL + hourly snapshot | 30 days |
| PostgreSQL (analytics) | 24 hours | 24 hours | Daily snapshot | 90 days |
| File Storage (S3) | 24 hours | 2 hours | Daily + versioning | 90 days |
| Redis (cache) | 0 (ephemeral) | 15 minutes | N/A (rebuildable) | N/A |
| Configuration | 24 hours | 1 hour | Git + daily snapshot | Indefinite |

### Definitions

- **RPO (Recovery Point Objective)**: Maximum acceptable data loss in time
- **RTO (Recovery Time Objective)**: Maximum acceptable downtime

## Backup Procedures

### PostgreSQL Primary

#### Continuous WAL Archiving

```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 s3://backups/wal/%f'
archive_timeout = 300  # Force archive every 5 minutes
```

#### Hourly Snapshots

```bash
#!/bin/bash
# backup_pg.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="s3://backups/pg/${TIMESTAMP}"

# Base backup
pg_basebackup \
  -D "${BACKUP_PATH}" \
  -Ft -z -P \
  --wal-method=stream \
  --checkpoint=fast

# Verify backup
pg_verifybackup "${BACKUP_PATH}"

# Tag with metadata
aws s3api put-object-tagging \
  --bucket backups \
  --key "pg/${TIMESTAMP}" \
  --tagging "TagSet=[{Key=company_id,Value=all},{Key=type,Value=base_backup}]"
```

#### Supabase-Specific

```sql
-- Supabase project backup
-- Uses pg_dump with custom format
pg_dump \
  --host=db.xxx.supabase.co \
  --port=5432 \
  --dbname=postgres \
  --username=postgres \
  --format=custom \
  --compress=9 \
  --file="backup_${TIMESTAMP}.dump"
```

### File Storage

```bash
#!/bin/bash
# backup_s3.sh

# Cross-region replication enabled
# Additional daily verification sync

aws s3 sync \
  s3://adminmate-files \
  s3://adminmate-files-backup \
  --storage-class STANDARD_IA \
  --delete

# Verify count match
SOURCE_COUNT=$(aws s3 ls s3://adminmate-files --recursive | wc -l)
BACKUP_COUNT=$(aws s3 ls s3://adminmate-files-backup --recursive | wc -l)

if [ "$SOURCE_COUNT" -ne "$BACKUP_COUNT" ]; then
  echo "ERROR: File count mismatch" | slack-notify
fi
```

### Redis Cache

```bash
# Redis persistence (RDB + AOF)
# No separate backup needed - rebuildable from PostgreSQL
# Cache warming script on startup

redis-cli BGSAVE
```

## Backup Storage

### Locations

| Location | Region | Purpose |
|----------|--------|---------|
| Primary | us-east-1 | Active backups |
| Secondary | us-west-2 | Cross-region replication |
| Archive | Glacier | Long-term retention |

### Encryption

```bash
# All backups encrypted at rest with AWS KMS
aws s3 cp backup.dump s3://backups/ \
  --sse aws:kms \
  --sse-kms-key-id arn:aws:kms:us-east-1:xxx:key/yyy
```

### Access Control

- Backup buckets: Only SRE and Platform Engineering roles
- Encryption keys: Separate KMS key with rotation
- Access logged via CloudTrail
- No direct internet access to backup storage

## Retention Schedule

### PostgreSQL Backups

| Type | Retention | Storage Class |
|------|-----------|---------------|
| Hourly | 24 hours | Standard |
| Daily | 30 days | Standard-IA |
| Weekly | 90 days | Standard-IA |
| Monthly | 1 year | Glacier |
| Annual | 7 years | Glacier Deep Archive |

### File Storage

| Type | Retention | Storage Class |
|------|-----------|---------------|
| Versioning | 90 days | Standard-IA |
| Deleted Objects | 30 days | Standard-IA |

### Cleanup Automation

```bash
#!/bin/bash
# cleanup_old_backups.sh

# Delete hourly backups older than 24 hours
aws s3 ls s3://backups/pg/ | \
  awk '$1 < "'$(date -d '24 hours ago' +%Y-%m-%d)'"' | \
  xargs -I {} aws s3 rm s3://backups/pg/{}

# Move daily backups older than 30 days to Glacier
aws s3 ls s3://backups/pg/ | \
  awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'"' | \
  xargs -I {} aws s3 cp s3://backups/pg/{} s3://backups-archive/{} \
    --storage-class GLACIER
```

## Restore Procedures

### PostgreSQL Restore

```bash
#!/bin/bash
# restore_pg.sh

BACKUP_PATH=$1
TARGET_DB=$2

# Stop writes to database
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}';"

# Drop and recreate
dropdb "${TARGET_DB}"
createdb "${TARGET_DB}"

# Restore from backup
pg_restore \
  --host=localhost \
  --dbname="${TARGET_DB}" \
  --no-owner \
  --no-privileges \
  "${BACKUP_PATH}"

# Verify row counts
psql "${TARGET_DB}" -c "SELECT schemaname, tablename, n_tup_ins FROM pg_stat_user_tables;"
```

### File Restore

```bash
#!/bin/bash
# restore_s3.sh

TIMESTAMP=$1

# Restore from specific timestamp
aws s3 sync \
  s3://adminmate-files-backup \
  s3://adminmate-files \
  --exclude "*" \
  --include "*${TIMESTAMP}*"
```

## Verification

### Automated Checks

```bash
#!/bin/bash
# verify_backup.sh

BACKUP_PATH=$1

# 1. Check file exists and size
if [ ! -f "${BACKUP_PATH}" ]; then
  echo "FAIL: Backup file not found"
  exit 1
fi

# 2. Verify checksum
sha256sum -c "${BACKUP_PATH}.sha256"
if [ $? -ne 0 ]; then
  echo "FAIL: Checksum mismatch"
  exit 1
fi

# 3. Test restore to staging
pg_restore --test "${BACKUP_PATH}"
if [ $? -ne 0 ]; then
  echo "FAIL: Restore test failed"
  exit 1
fi

echo "PASS: Backup verified"
```

## Acceptance Criteria

- [ ] RPO/RTO targets documented and achievable
- [ ] All backup scripts tested in staging
- [ ] Backup encryption verified
- [ ] Restore procedures documented
- [ ] Retention schedule implemented
- [ ] Automated cleanup working
- [ ] Backup verification checks passing
- [ ] On-call runbook updated with restore steps
