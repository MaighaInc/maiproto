#!/usr/bin/env bash
set -euo pipefail

docker run -d \
  --name taxpro-postgres \
  --platform linux/amd64 \
  -e POSTGRES_USER=upsilon \
  -e POSTGRES_PASSWORD=upsilontaxpro \
  -e POSTGRES_DB=upsilondb \
  -p 5433:5432 \
  -v upsilon_pgdata:/var/lib/postgresql \
  postgres:18
