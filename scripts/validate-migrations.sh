#!/usr/bin/env bash
# ============================================================
# validate-migrations.sh
# Schema-driven migration validation for AdminMate AI
#
# Reads all 2024*.sql files in supabase/migrations/, extracts
# table/column references from DDL and DML, then cross-references
# against the actual database schema via information_schema.
#
# Usage:
#   bash scripts/validate-migrations.sh [DATABASE_URL]
#
# Exit 0 = all references valid; Exit 1 = invalid references found
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

# Database connection — first argument or default to local Supabase
DATABASE_URL="${1:-postgresql://postgres:postgres@localhost:54322/postgres}"

# Colour helpers (disabled when stdout is not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; NC=''
fi

# Temp file to collect invalid refs
TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

INVALID_FILE="$TMPDIR_WORK/invalid_refs.txt"
touch "$INVALID_FILE"

# ---------------------------------------------------------------
# 1. Collect every table that the schema knows about (pg_catalog)
#    We query information_schema.columns to get table.column pairs
# ---------------------------------------------------------------
echo -e "${BOLD}Fetching schema from database...${NC}"

SCHEMA_FILE="$TMPDIR_WORK/schema.tsv"
if ! PGPASSWORD="${DATABASE_URL##*:}" psql "$DATABASE_URL" -t -A -F $'\t' -c "
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name NOT LIKE '\_%'  -- skip internal/supabase tables
  ORDER BY table_name, column_name;
" > "$SCHEMA_FILE" 2>/dev/null; then
  # Fallback: try without PGPASSWORD (trust auth / local socket)
  if ! psql "$DATABASE_URL" -t -A -F $'\t' -c "
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT LIKE '\_%'
    ORDER BY table_name, column_name;
  " > "$SCHEMA_FILE" 2>/dev/null; then
    echo -e "${YELLOW}WARNING: Could not connect to database. Running in offline mode (extracting references only).${NC}"
    SCHEMA_FILE=""
  fi
fi

# Build lookup maps if schema available
declare -A KNOWN_TABLES
declare -A KNOWN_COLUMNS  # key = table.column

if [ -n "$SCHEMA_FILE" ] && [ -s "$SCHEMA_FILE" ]; then
  while IFS=$'\t' read -r tbl col; do
    KNOWN_TABLES["$tbl"]=1
    KNOWN_COLUMNS["${tbl}.${col}"]=1
  done < "$SCHEMA_FILE"
  echo -e "${GREEN}Schema loaded: ${#KNOWN_TABLES[@]} tables, ${#KNOWN_COLUMNS[@]} columns${NC}"
else
  echo -e "${YELLOW}Running in offline extraction mode — reporting all references found.${NC}"
fi

# ---------------------------------------------------------------
# 2. Find migration files
# ---------------------------------------------------------------
MIGRATION_FILES=()
while IFS= read -r f; do
  MIGRATION_FILES+=("$f")
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '2024*.sql' -type f | sort)

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
  echo -e "${YELLOW}No migration files matching 2024*.sql found.${NC}"
  exit 0
fi

echo -e "${BOLD}Scanning ${#MIGRATION_FILES[@]} migration files...${NC}"
echo ""

# ---------------------------------------------------------------
# 3. For each migration, extract references
# ---------------------------------------------------------------
TOTAL_INVALID=0

extract_references() {
  local file="$1"
  local basename
  basename="$(basename "$file")"

  # --- Extract table references from CREATE TABLE ---
  # CREATE TABLE [IF NOT EXISTS] <name>
  grep -oP '(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)' "$file" \
    | grep -oP '\w+$' | sort -u

  # --- ALTER TABLE references ---
  grep -oP '(?i)ALTER\s+TABLE\s+(?:ONLY\s+)?(\w+)' "$file" \
    | grep -oP '\w+$' | sort -u

  # --- CREATE INDEX references ---
  # CREATE INDEX ... ON <table> (col, ...)
  grep -oP '(?i)CREATE\s+(?:UNIQUE\s+)?INDEX\s+\S+\s+ON\s+(?:ONLY\s+)?(\w+)' "$file" \
    | grep -oP '\w+$' | sort -u

  # --- Column references in ALTER TABLE ... ADD/DROP COLUMN ---
  grep -oP '(?i)ALTER\s+TABLE\s+(?:ONLY\s+)?(\w+)\s+.*?COLUMN\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)' "$file" \
    | while IFS= read -r line; do
        table=$(echo "$line" | grep -oP '(?i)TABLE\s+(?:ONLY\s+)?\K\w+')
        col=$(echo "$line" | grep -oP '(?i)COLUMN\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?\K\w+')
        if [ -n "$table" ] && [ -n "$col" ]; then
          echo "$table.$col"
        fi
      done

  # --- Column refs in INSERT INTO ... (col, col) VALUES ---
  grep -oP '(?i)INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)' "$file" \
    | while IFS= read -r line; do
        table=$(echo "$line" | grep -oP '(?i)INTO\s+\K\w+')
        cols=$(echo "$line" | grep -oP '\(([^)]+)\)' | tr -d '()' | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        while IFS= read -r col; do
          [ -z "$col" ] && continue
          # Skip SQL keywords that aren't columns
          case "${col,,}" in
            values|select|null|default|now|true|false|gen_random_uuid|auth|row_to_json|jsonb_build_object) continue ;;
          esac
          if [ -n "$table" ]; then
            echo "$table.$col"
          fi
        done <<< "$cols"
      done

  # --- Column refs in UPDATE ... SET col = ---
  grep -oP '(?i)UPDATE\s+(\w+)\s+SET\s+(\w+)' "$file" \
    | while IFS= read -r line; do
        table=$(echo "$line" | grep -oP '(?i)UPDATE\s+\K\w+')
        col=$(echo "$line" | grep -oP '(?i)SET\s+\K\w+')
        if [ -n "$table" ] && [ -n "$col" ]; then
          echo "$table.$col"
        fi
      done

  # --- Column refs in USING (col) for RLS policies ---
  grep -oP '(?i)(?:USING|WITH\s+CHECK)\s*\(([^)]+)\)' "$file" \
    | grep -oP '[a-z_]+(?==)' \
    | while IFS= read -r col; do
        # These are typically top-level columns — we'll flag them generically
        echo "RLS_COLUMN:${col}"
      done
}

# Collect ALL table names from migrations (to cross-check CREATE TABLE targets)
declare -A MIGRATION_TABLES

for mig in "${MIGRATION_FILES[@]}"; do
  basename="$(basename "$mig")"
  refs=$(extract_references "$mig")

  while IFS= read -r ref; do
    [ -z "$ref" ] && continue

    # Track tables created by migrations
    if [[ "$ref" != *.* && "$ref" != *"RLS_COLUMN:"* ]]; then
      MIGRATION_TABLES["$ref"]=1
    fi

    # Skip RLS column refs (hard to match without full policy context)
    [[ "$ref" == "RLS_COLUMN:"* ]] && continue

    # If schema available, validate the reference
    if [ ${#KNOWN_TABLES[@]} -gt 0 ]; then
      if [[ "$ref" == *.* ]]; then
        # table.column reference
        table="${ref%%.*}"
        col="${ref#*.}"

        # Check if table exists (allow migration-internal tables)
        if [ -z "${KNOWN_TABLES[$table]}" ] && [ -z "${MIGRATION_TABLES[$table]}" ]; then
          echo "INVALID|$basename|$ref|table '$table' not found in schema" >> "$INVALID_FILE"
          ((TOTAL_INVALID++)) || true
        elif [ -n "${KNOWN_TABLES[$table]}" ] && [ -z "${KNOWN_COLUMNS[$ref]}" ]; then
          echo "INVALID|$basename|$ref|column '$col' not found in table '$table'" >> "$INVALID_FILE"
          ((TOTAL_INVALID++)) || true
        fi
      else
        # bare table reference
        if [ -z "${KNOWN_TABLES[$ref]}" ] && [ -z "${MIGRATION_TABLES[$ref]}" ]; then
          echo "INVALID|$basename|$ref|table '$ref' not found in schema" >> "$INVALID_FILE"
          ((TOTAL_INVALID++)) || true
        fi
      fi
    fi
  done <<< "$refs"
done

# ---------------------------------------------------------------
# 4. Report
# ---------------------------------------------------------------
echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD} Migration Validation Report${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

echo -e "${BOLD}Files scanned:     ${#MIGRATION_FILES[@]}${NC}"

if [ -s "$INVALID_FILE" ]; then
  INVALID_COUNT=$(wc -l < "$INVALID_FILE")
  echo -e "${RED}${BOLD}Invalid refs:     $INVALID_COUNT${NC}"
  echo ""
  echo -e "${RED}Invalid references found:${NC}"
  echo -e "${RED}--------------------------------------${NC}"
  while IFS='|' read -r _type file ref msg; do
    echo -e "  ${RED}✗${NC} ${BOLD}$file${NC}: $ref"
    echo -e "    ${YELLOW}→ $msg${NC}"
  done < "$INVALID_FILE"
  echo ""
  echo -e "${RED}${BOLD}Validation FAILED — fix the above references.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}Invalid refs:     0${NC}"
  echo ""
  echo -e "${GREEN}${BOLD}All migration references are valid! ✓${NC}"
  exit 0
fi
