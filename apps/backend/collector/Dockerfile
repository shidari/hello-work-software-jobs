FROM node:22-slim AS base

RUN apt-get update && \
    apt-get install -y fonts-noto-cjk && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

# ── builder: models ビルド用 ──
FROM base AS builder

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/models/ packages/models/
COPY apps/backend/collector/package.json apps/backend/collector/

RUN pnpm install --frozen-lockfile

RUN cd packages/models && pnpm build

# ── runner: 本番用 ──
FROM base AS runner

RUN groupadd -r collector && useradd -r -g collector -m collector

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/models/package.json packages/models/
COPY apps/backend/collector/package.json apps/backend/collector/

RUN pnpm install --frozen-lockfile --prod

# Copy built models dist from builder
COPY --from=builder /app/packages/models/dist/ packages/models/dist/

# Install Playwright Chromium to a shared path accessible by non-root user
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
RUN cd apps/backend/collector && pnpm exec playwright install --with-deps chromium && \
    chmod -R o+rx /opt/pw-browsers

# Copy collector source
COPY apps/backend/collector/ apps/backend/collector/

RUN chown -R collector:collector /app

USER collector

WORKDIR /app/apps/backend/collector

EXPOSE 8080

CMD ["pnpm", "exec", "tsx", "functions/index.ts"]
