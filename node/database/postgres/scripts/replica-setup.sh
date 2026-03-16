#!/bin/bash
set -e

PGDATA=/var/lib/postgresql/data
PRIMARY_HOST=postgresDB
PRIMARY_PORT=5432
REPLICATION_USER=replicator
REPLICATION_PASS=replicator

# Ensure data directory is owned by postgres user with correct permissions
chown -R postgres:postgres $PGDATA
chmod 700 $PGDATA

# Only run setup if data directory is empty (first start)
if [ -z "$(ls -A $PGDATA 2>/dev/null)" ]; then
  echo "[Replica] Running pg_basebackup from primary..."
  PGPASSWORD=$REPLICATION_PASS gosu postgres pg_basebackup \
    -h $PRIMARY_HOST \
    -p $PRIMARY_PORT \
    -U $REPLICATION_USER \
    -D $PGDATA \
    -Fp -Xs -P -R

  echo "[Replica] Base backup complete. Standby signal written."
else
  echo "[Replica] Data directory exists, skipping pg_basebackup."
fi

echo "[Replica] Starting PostgreSQL in standby mode..."
exec gosu postgres postgres -c hot_standby=on
