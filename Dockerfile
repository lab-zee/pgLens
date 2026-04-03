# ── Build stage ──
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Install dependencies first (cache-friendly)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/server/ packages/server/
COPY packages/client/ packages/client/

RUN pnpm --filter @pglens/client run build
RUN pnpm --filter @pglens/server run build

# ── Production stage ──
FROM node:22-slim AS production

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy only what's needed for production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build /app/packages/server/dist packages/server/dist
COPY --from=build /app/packages/client/dist packages/client/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
