# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-02

### Added

- PostgreSQL connection via connection string with pool management
- Saved connections with masked passwords, one-click reconnect, and remove
- Schema introspection: tables, columns, primary keys, foreign keys, indexes
- Row count estimation (exact for <10k rows, pg_stat estimate for larger)
- Paginated data queries with server-side sorting
- Full-text search across all columns or a specific column
- React dashboard with table list sidebar and detail/data/records views
- Record view: each row as a card with type-aware UI widgets
- Type-aware cell rendering: booleans, JSON/JSONB, UUIDs, timestamps, dates, arrays, numbers, emails, URLs, color hex codes
- Relationship graph: SVG network diagram of FK connections between tables
- Connection form with error handling and loading states
- Table card widgets showing column preview, row count, FK/index counts
- Schema detail view with column metadata, FK relationships, index listing
- TanStack Table-powered data grid with sortable columns
- Docker support: Dockerfile (multi-stage), docker-compose.yml
- Production mode: single process serves API + static client
- Vitest test suites: 33 server tests + 80 client tests
- Integration smoke test against real PostgreSQL (read-only)
- GitHub Actions CI: lint, typecheck, test with coverage, build
- TypeScript strict mode, ESLint, Prettier
- pnpm monorepo with `@pglens/server` and `@pglens/client` packages
