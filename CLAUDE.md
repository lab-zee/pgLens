# CLAUDE.md

Project context for AI-assisted development.

## What is this?

pgLens is a database exploration tool supporting PostgreSQL and SQLite. Paste a connection string or file path, instantly see all tables, schemas, relationships, and data. Designed for developers who build apps agentically and need visibility into their data structures.

## Architecture

- **Monorepo** via pnpm workspaces: `packages/server` + `packages/client`
- **Server**: Fastify 5, node-postgres (`pg`), better-sqlite3, Zod validation, TypeScript strict
- **Client**: React 19, Vite, TanStack Table, Tailwind CSS v4, TypeScript strict
- **Database abstraction**: `DatabaseAdapter` interface with `PostgresAdapter` and `SqliteAdapter` implementations
- **No ORM** — PostgreSQL uses `information_schema` and `pg_catalog`; SQLite uses `PRAGMA` and `sqlite_master`
- **Production**: single process serves both API and static client build

## Key Design Decisions

- Connection strings go server-side only — the client never touches credentials directly
- Database-specific introspection is encapsulated in adapter implementations
- PostgreSQL row counts use `pg_stat` estimates for tables >10k rows, exact `COUNT(*)` for smaller ones; SQLite always uses exact counts
- Cell rendering is deterministic based on `udt_name` — no configuration needed
- All data access is read-only by design
- Saved connections stored in browser localStorage only — nothing server-side

## Commands

```bash
pnpm dev              # Start both server (3001) and client (5173)
pnpm start            # Production build + serve on :3001
pnpm test             # Run all tests
pnpm test:coverage    # Tests with coverage
pnpm lint             # ESLint
pnpm typecheck        # TypeScript checking
pnpm build            # Production build
docker compose up     # Docker (no Node needed)
```

## Test Strategy

- Server unit tests mock `DatabaseAdapter` or `pg.Pool` — no database needed
- SQLite adapter tests use a real temporary database file
- Server route tests use Fastify's `inject()` — no HTTP needed
- Client component tests use Testing Library + jsdom
- Integration tests require `DATABASE_URL` env var, use read-only sessions
- All tests run via Vitest

## File Naming Conventions

- Server services: `packages/server/src/services/<name>.ts`
- Server routes: `packages/server/src/routes/<name>.ts`
- Client components: `packages/client/src/components/<Name>.tsx`
- Client hooks: `packages/client/src/hooks/use<Name>.ts`
- Tests mirror source: `tests/unit/<name>.test.ts`, `tests/components/<Name>.test.tsx`
