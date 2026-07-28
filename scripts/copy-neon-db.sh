#!/usr/bin/env bash
# Copy schema + data from one Neon Postgres database to another (empty) Neon database.
#
# Requirements:
#   - Local Postgres client tools: pg_dump, pg_restore, psql
#     (e.g. sudo apt install postgresql-client)
#   - Direct Neon connection strings (host without "-pooler"), with sslmode=require
#
# Usage:
#   1. Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL below
#   2. ./scripts/copy-neon-db.sh [--yes] [--keep-dump] [--dry-run]
#
# Flags:
#   --yes         Skip interactive confirmation (type COPY)
#   --keep-dump   Leave the temporary custom-format dump file after restore
#   --dry-run     Validate tools/URLs/target emptiness and print planned steps; no dump/restore

set -euo pipefail

# --- Edit these (direct Neon URLs, not -pooler) ---
SOURCE_DATABASE_URL='postgresql://neondb_owner:npg_2mnEyQd5uADF@ep-bold-star-apbi7rav-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
TARGET_DATABASE_URL='postgresql://neondb_owner:npg_4UZqvXwC6sFb@ep-nameless-frog-awwzat0n-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
# -------------------------------------------------

KEEP_DUMP=0
SKIP_CONFIRM=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  Edit SOURCE_DATABASE_URL and TARGET_DATABASE_URL at the top of this script, then:
  ./scripts/copy-neon-db.sh [--yes] [--keep-dump] [--dry-run]

Copies full schema and data from SOURCE to an empty TARGET using pg_dump -Fc / pg_restore.

Flags:
  --yes         Skip interactive confirmation (type COPY)
  --keep-dump   Leave the temporary custom-format dump file after restore
  --dry-run     Validate and report what would run; do not dump or restore

Requires direct Neon URLs (no -pooler) and local pg_dump, pg_restore, psql.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --yes)
      SKIP_CONFIRM=1
      ;;
    --keep-dump)
      KEEP_DUMP=1
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

die() {
  echo "error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1 (install postgresql-client)"
}

# Strip query string for equality compare / display helpers.
normalize_url() {
  local url="$1"
  echo "${url%%\?*}"
}

# Extract host from a postgres URL (postgresql://user:pass@host:port/db).
url_host() {
  local url normalized
  url="$(normalize_url "$1")"
  # Drop scheme
  normalized="${url#*://}"
  # Drop userinfo if present
  if [[ "$normalized" == *@* ]]; then
    normalized="${normalized#*@}"
  fi
  # Host is before first / or :
  normalized="${normalized%%/*}"
  echo "${normalized%%:*}"
}

# Extract database name (path after host, before query).
url_dbname() {
  local url normalized path
  url="$(normalize_url "$1")"
  normalized="${url#*://}"
  if [[ "$normalized" == *@* ]]; then
    normalized="${normalized#*@}"
  fi
  path="${normalized#*/}"
  if [[ -z "$path" || "$path" == "$normalized" ]]; then
    echo "(unknown)"
  else
    echo "$path"
  fi
}

redact_url() {
  local host db
  host="$(url_host "$1")"
  db="$(url_dbname "$1")"
  echo "host=${host} db=${db}"
}

count_public_relations() {
  local url="$1"
  psql "$url" -v ON_ERROR_STOP=1 -Atc \
    "SELECT COUNT(*)::int
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f');"
}

require_cmd pg_dump
require_cmd pg_restore
require_cmd psql

if [[ -z "$SOURCE_DATABASE_URL" || "$SOURCE_DATABASE_URL" == *"USER:PASSWORD"* ]]; then
  die "set SOURCE_DATABASE_URL at the top of this script to a real Neon connection string"
fi
if [[ -z "$TARGET_DATABASE_URL" || "$TARGET_DATABASE_URL" == *"USER:PASSWORD"* ]]; then
  die "set TARGET_DATABASE_URL at the top of this script to a real Neon connection string"
fi

SOURCE_NORM="$(normalize_url "$SOURCE_DATABASE_URL")"
TARGET_NORM="$(normalize_url "$TARGET_DATABASE_URL")"

if [[ "$SOURCE_NORM" == "$TARGET_NORM" ]]; then
  die "SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different"
fi

SOURCE_HOST="$(url_host "$SOURCE_DATABASE_URL")"
TARGET_HOST="$(url_host "$TARGET_DATABASE_URL")"

if [[ "$SOURCE_HOST" == *"-pooler"* ]]; then
  echo "warning: SOURCE host contains '-pooler'. Use the direct Neon endpoint for pg_dump." >&2
fi
if [[ "$TARGET_HOST" == *"-pooler"* ]]; then
  echo "warning: TARGET host contains '-pooler'. Use the direct Neon endpoint for pg_restore." >&2
fi

echo "Source: $(redact_url "$SOURCE_DATABASE_URL")"
echo "Target: $(redact_url "$TARGET_DATABASE_URL")"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Mode: dry-run (no dump/restore)"
fi

if [[ "$DRY_RUN" -eq 0 && "$SKIP_CONFIRM" -eq 0 ]]; then
  echo
  echo "This will copy schema + data from source into the target database."
  printf "Type COPY to continue: "
  read -r confirm
  if [[ "$confirm" != "COPY" ]]; then
    die "aborted (expected COPY)"
  fi
fi

echo "Checking connectivity and target emptiness..."
SOURCE_REL_COUNT="$(count_public_relations "$SOURCE_DATABASE_URL")"
TARGET_REL_COUNT="$(count_public_relations "$TARGET_DATABASE_URL")"
echo "Source public relations: ${SOURCE_REL_COUNT}"
echo "Target public relations: ${TARGET_REL_COUNT}"

if [[ "$TARGET_REL_COUNT" -gt 0 ]]; then
  die "target public schema is not empty (${TARGET_REL_COUNT} relations). Refusing to overwrite."
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo
  echo "Would run:"
  echo "  pg_dump -Fc --no-owner --no-acl -f <temp.dump> <SOURCE_DATABASE_URL>"
  echo "  pg_restore --no-owner --no-acl --verbose -d <TARGET_DATABASE_URL> <temp.dump>"
  echo "  compare public relation counts (expect source=${SOURCE_REL_COUNT} on both)"
  if [[ "$KEEP_DUMP" -eq 1 ]]; then
    echo "  keep dump file (--keep-dump)"
  else
    echo "  delete temp dump after restore"
  fi
  echo "Dry run OK."
  exit 0
fi

TMPDUMP="$(mktemp "${TMPDIR:-/tmp}/neon-db-copy.XXXXXX.dump")"
cleanup() {
  if [[ "$KEEP_DUMP" -eq 0 && -n "${TMPDUMP:-}" && -f "$TMPDUMP" ]]; then
    rm -f "$TMPDUMP"
  fi
}
trap cleanup EXIT

echo "Dumping source to ${TMPDUMP} ..."
pg_dump -Fc --no-owner --no-acl -f "$TMPDUMP" "$SOURCE_DATABASE_URL"

echo "Restoring into target ..."
pg_restore --no-owner --no-acl --verbose -d "$TARGET_DATABASE_URL" "$TMPDUMP"

echo "Verifying relation counts (public) ..."
SOURCE_REL_COUNT="$(count_public_relations "$SOURCE_DATABASE_URL")"
TARGET_REL_COUNT="$(count_public_relations "$TARGET_DATABASE_URL")"
echo "Source public relations: ${SOURCE_REL_COUNT}"
echo "Target public relations: ${TARGET_REL_COUNT}"

if [[ "$SOURCE_REL_COUNT" != "$TARGET_REL_COUNT" ]]; then
  die "relation count mismatch after copy (source=${SOURCE_REL_COUNT} target=${TARGET_REL_COUNT})"
fi

if [[ "$KEEP_DUMP" -eq 1 ]]; then
  echo "Dump kept at: ${TMPDUMP}"
fi

echo "Done."
