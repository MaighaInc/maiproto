# taxpro-prisma-migrations

Standalone, zero-dep Prisma migration project for the Upsilon TaxPro database.  
No TypeScript, no Express, no Firebase — just `prisma`.

## Structure

```
taxpro-prisma-migrations/
├── prisma/
│   ├── schema.prisma        ← source of truth for DB schema
│   └── migrations/          ← created after first migrate dev
├── scripts/
│   └── start-postgres.sh    ← spins up the Postgres Docker container
├── .env                     ← DATABASE_URL (gitignored)
├── .env.example
├── package.json
└── .gitignore
```

## Setup (first time)

```powershell
cd d:\taxpro-prisma-migrations

# 1. Start Postgres (standalone Docker container — no need to go to another project)
bash scripts/start-postgres.sh

# 2. Install prisma (only dependency)
npm install

# 3. Create the baseline migration + apply it
npm run init
```

`npm run init` = `prisma migrate reset --force && prisma migrate dev --name init`

It will:
- Drop all existing tables in upsilondb
- Run `migrate dev --name init` which generates `prisma/migrations/<timestamp>_init/migration.sql` and applies it

---

## Daily Commands

| What | Command |
|---|---|
| Schema changed → new migration | `npm run migrate:dev` (prompts for migration name) |
| See pending/applied migrations | `npm run migrate:status` |
| Full wipe + re-init from scratch | `npm run init` |
| Apply migrations (prod/CI) | `npm run migrate:deploy` |
| Visual DB browser | `npm run studio` |

---

## Syncing schema changes from taxpro-api

When you update `d:\taxpro\taxpro-api\prisma\schema.prisma`, copy it here:

```powershell
Copy-Item d:\taxpro\taxpro-api\prisma\schema.prisma d:\taxpro-prisma-migrations\prisma\schema.prisma
```

Then run `npm run migrate:dev` to generate the incremental migration.

---

## DATABASE_URL

| Environment | URL |
|---|---|
| Local (Docker Postgres on localhost) | `postgresql://upsilon:upsilontaxpro@localhost:5432/upsilondb?schema=public` |
| Inside Docker network | `postgresql://upsilon:upsilontaxpro@postgres:5432/upsilondb?schema=public` |
