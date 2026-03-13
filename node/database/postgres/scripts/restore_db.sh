#!/bin/bash
# restore_db.sh - PostgreSQL database restore script
# Supports local pg_restore and Docker exec
# Loads all credentials and config from environment file (required)
# Usage: ./scripts/restore_db.sh ENV_FILE BACKUP_FILE

set -e

# Require arguments
if [ $# -lt 2 ]; then
  echo "ERROR: Missing required arguments!"
  echo "Usage: ./scripts/restore_db.sh ENV_FILE BACKUP_FILE"
  echo "Example: ./scripts/restore_db.sh env_templates/.env.dev ./backups/devdb_backup_20260313_141530.dump"
  exit 1
fi

ENV_FILE=$1
BACKUP_FILE=$2

# Validate env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Environment file '$ENV_FILE' not found!"
  exit 1
fi

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file '$BACKUP_FILE' not found!"
  exit 1
fi

# Load environment variables from file (no defaults)
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Get values from env file (no hardcoded defaults)
DB_NAME=$POSTGRES_DB
DB_USER=$POSTGRES_DB_USER
DB_PASSWORD=$POSTGRES_DB_PASSWORD
DB_PORT=$POSTGRES_DB_PORT

# Validate all required variables are set
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_PORT" ]; then
  echo "ERROR: Missing required variables in $ENV_FILE"
  echo "Required: POSTGRES_DB, POSTGRES_DB_USER, POSTGRES_DB_PASSWORD, POSTGRES_DB_PORT"
  exit 1
fi

# Optional Docker container name (if set, use docker exec instead of local pg_restore)
CONTAINER=$POSTGRES_CONTAINER

# Validate pg_restore is available (only needed for local mode)
if [ -z "$CONTAINER" ] && ! command -v pg_restore &> /dev/null; then
  echo "ERROR: pg_restore not found. Install PostgreSQL client tools."
  exit 1
fi

echo "========================================="
echo "PostgreSQL Database Restore"
echo "========================================="
echo "Environment file: $ENV_FILE"
echo "Mode:            $([ -n "$CONTAINER" ] && echo "Docker exec ($CONTAINER)" || echo "Local pg_restore")"
echo "Database:        $DB_NAME"
echo "User:            $DB_USER"
echo "Host:            localhost (local mode only)"
echo "Port:            $DB_PORT"
echo "Restore from:    $BACKUP_FILE"
echo "========================================="
echo ""
echo "Starting restore..."

# Run restore via docker exec or local pg_restore
# --clean --if-exists: drops existing objects before recreating (handles already-exists conflicts)
if [ -n "$CONTAINER" ]; then
  # Docker exec mode
  if docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists -v < "$BACKUP_FILE" 2>&1; then
    echo ""
    echo "✓ Restore successful!"
    echo "========================================="
  else
    echo ""
    echo "✗ Restore failed!"
    exit 1
  fi
else
  # Local pg_restore mode
  if PGPASSWORD="$DB_PASSWORD" pg_restore -U "$DB_USER" -h localhost -p "$DB_PORT" -d "$DB_NAME" --clean --if-exists -v "$BACKUP_FILE" 2>&1; then
    echo ""
    echo "✓ Restore successful!"
    echo "========================================="
  else
    echo ""
    echo "✗ Restore failed!"
    exit 1
  fi
fi