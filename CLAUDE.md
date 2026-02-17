# CLAUDE.md

This file provides guidance for Claude Code to understand this repository.

## Project Overview

A monorepo application for collecting, managing, and searching Hello Work (Japanese job center) job listings.

## Architecture

```
hello-work-software-jobs/
├── apps/
│   ├── backend/
│   │   ├── job-store-api/          # Cloudflare Workers REST API (Hono + D1)
│   │   └── headless-crawler/       # AWS Lambda crawler (Playwright)
│   └── frontend/
│       └── hello-work-job-searcher/ # Next.js web app
├── packages/
│   └── models/                      # Shared TypeScript types & schemas
```

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Next.js 16, React 19, Jotai, Hono RPC |
| API | Cloudflare Workers, Hono, Drizzle ORM, D1 (SQLite) |
| Crawler | AWS Lambda, CDK, Playwright, Effect |
| Shared | TypeScript 5.8, Valibot, neverthrow |
| Quality | Biome, CommitLint, Playwright/Vitest |

## Common Commands

```bash
# Root
pnpm test              # Run all tests
pnpm type-check        # Type check
pnpm lint              # Lint
pnpm format            # Format

# Frontend (apps/frontend/hello-work-job-searcher)
pnpm dev               # Dev server (port 9002)
pnpm build             # Build
pnpm test              # Playwright E2E tests

# API (apps/backend/job-store-api)
pnpm dev               # Wrangler dev server (port 8787)
pnpm deploy            # Deploy to Cloudflare
pnpm test              # Vitest tests

# Crawler (apps/backend/headless-crawler)
pnpm deploy            # AWS CDK deploy
```

## API Endpoints

Base: `/api/v1`

- `GET /jobs` - List jobs (with filters)
- `GET /jobs/{jobNumber}` - Get job details
- `POST /jobs` - Create job
- `GET /jobs/continue` - Pagination continuation

## Database

- ORM: Drizzle ORM
- DB: Cloudflare D1 (SQLite)
- Schema: `apps/backend/job-store-api/src/db/schema.ts`
- Migrations: `apps/backend/job-store-api/drizzle/`

## Coding Conventions

- **Formatting/Linting**: Use Biome
- **Commits**: Conventional Commits format
  - Message in Japanese
  - Include scope (e.g., `feat(api): 求人検索フィルターを追加`)
  - Include body explaining the change
- **Error Handling**: Use neverthrow Result types (no throwing exceptions)
- **Validation**: Runtime validation with Valibot
- **Package Manager**: pnpm 10.24.0
- **CLI実行**: `npx` ではなく `pnpm exec` を使うこと
- **コミット前チェック**: ユーザーが「コミット」を依頼したら、`git commit` の前に以下を実行すること
  1. `pnpm exec biome check --write <staged files>` (staged ファイルのみ lint + format)
  2. 変更があったパッケージのみ `pnpm exec tsc --noEmit` (型チェック)
  - 問題があれば修正してからコミットする

## Environment Variables

- Frontend: `JOB_STORE_ENDPOINT`
- API: `JWT_SECRET`, Cloudflare credentials
- Crawler: AWS credentials, queue URLs

## CI/CD

- `pr-checks.yml` - Build, test, format on PRs
- `deploy.yml` - AWS CDK deploy on push to main
- `run-lambda-weekly-days.yml` - Weekly crawler execution
