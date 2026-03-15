-- Grant postgres user access to pg_shadow for PgBouncer auth_query
-- postgres is already a superuser so pg_shadow access is built-in.

-- Create replication user for streaming replication
CREATE USER replicator WITH REPLICATION PASSWORD 'replicator';
