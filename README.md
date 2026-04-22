# pgLens

See your data clearly. Connect to PostgreSQL or SQLite and instantly visualize your database — tables, schemas, relationships, and data.

**The problem:** People can build apps quicker than ever with AI, but they don't always have a firm grasp on the underlying data structures — how tables connect, what's in them, what types are used. pgLens gives you instant visibility.

## Features

- **One-click connect** — Paste a PostgreSQL connection string or SQLite file path and go
- **Saved connections** — Recent connections are remembered with masked passwords, one click to reconnect
- **Auto-discovery** — Finds all tables, columns, types, primary keys, foreign keys, and indexes
- **Relationship graph** — SVG network diagram showing FK connections between tables
- **Record view** — Each row rendered as a card with type-aware UI widgets (toggles, expandable JSON, formatted dates, copy-able UUIDs, mailto links, color swatches, and more)
- **Type-aware data grid** — Booleans render as badges, JSON is expandable, UUIDs are truncated, timestamps are formatted, and numbers are tabular
- **Full-text search** — Search across all columns or filter by a specific column, with debounced input
- **Schema detail view** — Column metadata, FK relationships, and index listing at a glance
- **Paginated browsing** — Server-side pagination and sorting for tables of any size

## Quick Start

### Option 1: Docker (recommended for trying it out)

```bash
docker compose up
```

Open http://localhost:3001 and paste your PostgreSQL connection string or SQLite file path. That's it.

### Option 2: Docker without Compose

```bash
docker build -t pglens .
docker run -p 3001:3001 pglens
```

### Option 3: Node.js

```bash
# Prerequisites: Node.js >= 24, pnpm >= 9
pnpm install
pnpm start          # Build + run production server on :3001
```

### Option 4: Development mode

```bash
pnpm install
pnpm dev             # Server on :3001, Client on :5173 (hot reload)
```

### Deploy to a platform

pgLens needs a server runtime (it maintains live database connections), so static hosts like GitHub Pages won't work. It runs great on:

- **Railway** — connect your repo, set build command to `pnpm build`, start command to `node packages/server/dist/index.js`
- **Render** — same setup, or use the Dockerfile
- **Fly.io** — `fly launch` will auto-detect the Dockerfile
- **Any Docker host** — use the included Dockerfile

The only env var you might set is `PORT` (defaults to 3001).

## Privacy & Data

pgLens does **not** persist, log, or transmit your data or connection strings anywhere. Your database credentials stay in your browser (localStorage for saved connections) and in memory on the server for the duration of your session. Nothing is sent to any third party.

Because of this, we encourage running pgLens locally or self-hosting it. The code is fully open source — inspect it yourself.

## Tech Stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Server    | Node.js, Fastify, node-postgres (`pg`), better-sqlite3, Zod |
| Client    | React 19, Vite, TanStack Table, Tailwind CSS  |
| Testing   | Vitest, Testing Library, Fastify inject        |
| Tooling   | TypeScript (strict), ESLint, Prettier, pnpm    |
| CI        | GitHub Actions (lint, typecheck, test, build)  |

## Project Structure

```
packages/
  server/         # Fastify API — connection management, schema introspection, data queries
  client/         # React UI — connection form, dashboard, table widgets, data grid
```

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm start`         | Build + run production server on :3001   |
| `pnpm dev`           | Start server + client in dev mode        |
| `pnpm test`          | Run all tests                            |
| `pnpm test:coverage` | Run tests with coverage reports          |
| `pnpm lint`          | Lint all packages                        |
| `pnpm typecheck`     | TypeScript type checking                 |
| `pnpm build`         | Production build                         |
| `pnpm format`        | Format with Prettier                     |

## API

| Method | Endpoint                                          | Description              |
| ------ | ------------------------------------------------- | ------------------------ |
| POST   | `/api/connections`                                | Connect to a database    |
| GET    | `/api/connections`                                | List active connections  |
| DELETE | `/api/connections/:id`                            | Disconnect               |
| GET    | `/api/connections/:id/schema`                     | Introspect full schema   |
| GET    | `/api/connections/:id/tables/:name`               | Table detail             |
| GET    | `/api/connections/:id/tables/:name/data`          | Paginated table data     |
| GET    | `/api/health`                                     | Health check             |

Query params for data endpoint: `page`, `pageSize`, `sortColumn`, `sortDirection`, `search`, `searchColumn`.

## Testing

141 unit/component tests + 5 integration tests against real PostgreSQL.

```bash
pnpm test                    # Unit + component tests
DATABASE_URL="..." pnpm --filter @pglens/server test  # Include integration
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

- **Found a bug?** Open an issue
- **Have an idea?** Open an issue to discuss before building
- **Want to contribute?** Fork, branch, PR — we'll review promptly

## License

[MIT](LICENSE)
