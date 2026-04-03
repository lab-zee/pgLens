# Contributing to pgLens

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- A PostgreSQL database to test against (optional — unit tests don't need one)

### Getting Started

```bash
git clone https://github.com/davidinwald/pglens.git
cd pglens
pnpm install
```

### Running in Development

```bash
# Start both server and client
pnpm dev

# Or individually
pnpm dev:server   # Fastify on http://localhost:3001
pnpm dev:client   # Vite on http://localhost:5173
```

### Running Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode (per package)
cd packages/server && pnpm test:watch
cd packages/client && pnpm test:watch

# Integration test (requires DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm --filter @pglens/server test
```

### Code Quality

```bash
pnpm lint          # ESLint
pnpm lint:fix      # ESLint with auto-fix
pnpm format        # Prettier format
pnpm format:check  # Prettier check
pnpm typecheck     # TypeScript type checking
```

## Project Structure

```
packages/
  server/          # Fastify API server
    src/
      routes/      # API route handlers
      services/    # Business logic (connection, introspection, queries)
      types/       # TypeScript type definitions
    tests/
      unit/        # Unit tests with mocked pg
      integration/ # Smoke tests against real PostgreSQL
  client/          # React + Vite frontend
    src/
      components/  # React components
      hooks/       # Custom React hooks
      lib/         # Utilities (API client, cn helper)
      types/       # Shared type definitions
    tests/
      components/  # Component tests with testing-library
```

## Guidelines

- **Tests required**: All new features and bug fixes should include tests.
- **TypeScript strict**: No `any` types unless absolutely necessary.
- **Keep it simple**: This project values simplicity over cleverness.
- **Conventional commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.).

## Pull Request Process

1. Fork the repo and create a feature branch from `main`
2. Make your changes with tests
3. Ensure `pnpm lint && pnpm typecheck && pnpm test` all pass
4. Submit a PR with a clear description of the changes
