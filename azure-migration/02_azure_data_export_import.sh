#!/usr/bin/env bash
# =====================================================================================
# WebsiteBanja AI — Idempotent Data Export & Import Pipeline
# Source: Supabase PostgreSQL
# Target: Azure Database for PostgreSQL Flexible Server
# =====================================================================================

set -euo pipefail

DRY_RUN=false
TABLE_FILTER=""
WORK_DIR="${MIGRATION_WORK_DIR:-./azure-migration/dumps}"

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --table=*)
      TABLE_FILTER="${arg#*=}"
      shift
      ;;
    *)
      ;;
  esac
done

echo "================================================================================"
echo "WEBSITEBANJA AI — AZURE POSTGRESQL DATA MIGRATION"
echo "Mode: $( [ "$DRY_RUN" = true ] && echo "DRY RUN (No data writes to Azure)" || echo "LIVE MIGRATION" )"
echo "================================================================================"

SOURCE_URL="${SUPABASE_DIRECT_DB_URL:-${DATABASE_URL:-}}"
TARGET_URL="${AZURE_POSTGRESQL_DIRECT_URL:-${TARGET_DATABASE_URL:-}}"

ORDERED_TABLES=(
  "auth.users"
  "public.projects"
  "public.subscriptions"
  "public.website_members"
  "public.catalog_items"
  "public.published_versions"
  "public.preview_links"
  "public.analytics_events"
  "public.project_knowledge"
  "public.project_knowledge_revisions"
)

mkdir -p "$WORK_DIR"

echo ""
echo "[Step 1] Exporting tables from Source PostgreSQL..."

for table in "${ORDERED_TABLES[@]}"; do
  if [ -n "$TABLE_FILTER" ] && [ "$TABLE_FILTER" != "$table" ]; then
    continue
  fi

  dump_file="$WORK_DIR/${table//./_}.csv"
  echo "  -> Exporting $table to $dump_file..."

  if [ "$DRY_RUN" = true ]; then
    echo "     [DRY-RUN] Would run: psql \"\$SOURCE_URL\" -c \"\\copy (SELECT * FROM \$table) TO '\$dump_file' WITH (FORMAT csv, HEADER true)\""
  else
    if [ -n "$SOURCE_URL" ]; then
      psql "$SOURCE_URL" -c "\copy (SELECT * FROM $table) TO '$dump_file' WITH (FORMAT csv, HEADER true)"
      row_count=$(wc -l < "$dump_file" | tr -d " ")
      echo "     Exported $((row_count - 1)) rows."
    else
      echo "     [SKIPPED] Source connection string not provided. Set SUPABASE_DIRECT_DB_URL."
    fi
  fi
done

echo ""
echo "[Step 2] Importing into Azure Database for PostgreSQL Flexible Server..."

if [ "$DRY_RUN" = true ]; then
  echo "  [DRY-RUN] Target imports simulated successfully. No changes written."
  exit 0
fi

if [ -z "$TARGET_URL" ]; then
  echo "  [INFO] Target database connection string (AZURE_POSTGRESQL_DIRECT_URL) is not set."
  echo "         Data files have been dumped safely to $WORK_DIR ready for import once Azure credentials are provided."
  exit 0
fi

for table in "${ORDERED_TABLES[@]}"; do
  if [ -n "$TABLE_FILTER" ] && [ "$TABLE_FILTER" != "$table" ]; then
    continue
  fi

  dump_file="$WORK_DIR/${table//./_}.csv"
  if [ ! -f "$dump_file" ]; then
    echo "  -> Skipping $table (no dump file found at $dump_file)"
    continue
  fi

  echo "  -> Importing $table from $dump_file..."
  temp_table="tmp_mig_${table//./_}"
  
  psql "$TARGET_URL" -v ON_ERROR_STOP=1 <<EOF
BEGIN;
CREATE TEMP TABLE $temp_table (LIKE $table INCLUDING DEFAULTS) ON COMMIT DROP;
\copy $temp_table FROM '$dump_file' WITH (FORMAT csv, HEADER true);
INSERT INTO $table
SELECT * FROM $temp_table
ON CONFLICT DO NOTHING;
COMMIT;
EOF
  echo "     Import for $table completed successfully."
done

echo ""
echo "================================================================================"
echo "DATA MIGRATION COMPLETED"
echo "================================================================================"
