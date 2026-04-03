# Requirements

Tracking document for pgLens features and milestones.

## v0.1.0 — MVP

### Core

- [x] **REQ-001**: Connect to PostgreSQL via connection string
- [x] **REQ-002**: Auto-discover all tables in a schema
- [x] **REQ-003**: Introspect column metadata (name, type, nullable, default, PK)
- [x] **REQ-004**: Introspect foreign key relationships
- [x] **REQ-005**: Introspect indexes
- [x] **REQ-006**: Row count per table (exact for small, estimated for large)
- [x] **REQ-007**: Paginated data query with sorting
- [x] **REQ-008**: Connection management (connect, disconnect, list)
- [x] **REQ-009**: Full-text search across all columns or a specific column

### UI

- [x] **REQ-010**: Connection string input form
- [x] **REQ-011**: Dashboard with table list sidebar
- [x] **REQ-012**: Table card widgets (name, row count, column preview, FK/index counts)
- [x] **REQ-013**: Schema detail view (columns, FKs, indexes)
- [x] **REQ-014**: Data grid with type-aware cell rendering
- [x] **REQ-015**: Pagination controls
- [x] **REQ-016**: Column sorting (server-side)
- [x] **REQ-017**: Type-aware rendering (bool, JSON, UUID, dates, numbers, arrays, text truncation)
- [x] **REQ-018**: Record view with type-aware UI widgets per row
- [x] **REQ-019**: Relationship graph (SVG network diagram of FK connections)
- [x] **REQ-040**: Saved connections with masked passwords and one-click reconnect
- [x] **REQ-041**: Search bar with debounced input and column filtering

### Quality

- [x] **REQ-020**: Unit tests for server services (connection manager, introspector, data query)
- [x] **REQ-021**: API route tests via Fastify inject
- [x] **REQ-022**: Component tests for all UI components
- [x] **REQ-023**: Integration smoke test against real PostgreSQL
- [x] **REQ-024**: CI pipeline (lint, typecheck, test, build)
- [x] **REQ-025**: TypeScript strict mode throughout
- [x] **REQ-026**: ESLint + Prettier configured

### Deployment

- [x] **REQ-027**: Docker support (Dockerfile + docker-compose)
- [x] **REQ-028**: Single-process production mode (serves API + static client)

### Documentation

- [x] **REQ-030**: README with setup instructions
- [x] **REQ-031**: CONTRIBUTING guide
- [x] **REQ-032**: CHANGELOG
- [x] **REQ-033**: REQUIREMENTS tracking document
- [x] **REQ-034**: CLAUDE.md for AI-assisted development

## v0.2.0 — Planned

- [ ] **REQ-100**: ERD visualization (table relationship diagram with columns)
- [ ] **REQ-101**: JSON file ingestor (import JSON into tables)
- [ ] **REQ-102**: Query editor (raw SQL with results)
- [ ] **REQ-103**: Export data (CSV, JSON)
- [ ] **REQ-104**: Dark mode
- [ ] **REQ-105**: Multiple simultaneous connections
- [ ] **REQ-106**: Saved connection profiles
- [ ] **REQ-107**: Schema diff between connections
