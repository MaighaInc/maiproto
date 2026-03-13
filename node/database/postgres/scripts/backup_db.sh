#!/bin/bash
# backup_db.sh - PostgreSQL database backup script
# Supports local pg_dump and Docker exec
# Loads all credentials and config from environment file (required)
# Usage: ./scripts/backup_db.sh ENV_FILE BACKUP_DIR

set -e

# Require arguments
if [ $# -lt 2 ]; then
  echo "ERROR: Missing required arguments!"
  echo "Usage: ./backup_db.sh ENV_FILE BACKUP_DIR"
  echo "Example: ./backup_db.sh env_templates/.env.prod ./backups"
  exit 1
fi

ENV_FILE=$1
BACKUP_DIR=$2

# Validate env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Environment file '$ENV_FILE' not found!"
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

# Optional Docker container name (if set, use docker exec instead of local pg_dump)
CONTAINER=$POSTGRES_CONTAINER

# Validate pg_dump is available (only needed for local mode)
if [ -z "$CONTAINER" ] && ! command -v pg_dump &> /dev/null; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools."
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
if [ ! -w "$BACKUP_DIR" ]; then
  echo "ERROR: Backup directory '$BACKUP_DIR' is not writable."
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.dump"

echo "========================================="
echo "PostgreSQL Database Backup"
echo "========================================="
echo "Environment file: $ENV_FILE"
echo "Mode:            $([ -n "$CONTAINER" ] && echo "Docker exec ($CONTAINER)" || echo "Local pg_dump")"
echo "Database:        $DB_NAME"
echo "User:            $DB_USER"
echo "Host:            localhost (local mode only)"
echo "Port:            $DB_PORT"
echo "Backup to:       $BACKUP_FILE"
echo "Timestamp:       $TIMESTAMP"
echo "========================================="
echo ""
echo "Starting backup..."

# Run backup via docker exec or local pg_dump
if [ -n "$CONTAINER" ]; then
  # Docker exec mode
  if docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -b -v > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✓ Backup successful!"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $FILE_SIZE"
    echo "========================================="
  else
    echo ""
    echo "✗ Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
  fi
else
  # Local pg_dump mode
  if PGPASSWORD="$DB_PASSWORD" pg_dump -U "$DB_USER" -h localhost -p "$DB_PORT" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE" 2>&1; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✓ Backup successful!"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $FILE_SIZE"
    echo "========================================="
  else
    echo ""
    echo "✗ Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
  fi
fi
