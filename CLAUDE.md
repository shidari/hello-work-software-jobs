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
│   ├── db/                          # Drizzle schema & migrations
│   └── models/                      # Shared TypeScript types & schemas
```

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Next.js 16, React 19, Jotai, Hono RPC |
| API | Cloudflare Workers, Hono, Drizzle ORM, D1 (SQLite) |
| Crawler | AWS Lambda, CDK, Playwright, Effect |
| Shared | TypeScript 5.8, Effect Schema, neverthrow |
| Quality | Biome, Playwright/Vitest |

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
- Schema: `packages/db/src/schema.ts`
- Migrations: `packages/db/drizzle/`

## Coding Conventions

- **Formatting/Linting**: Use Biome（staged ファイルのみ対象。プロジェクト全体への実行は禁止）
- **Commits**: Conventional Commits format
  - Message in Japanese
  - Include scope (e.g., `feat(api): 求人検索フィルターを追加`)
  - Include body explaining the change
- **Error Handling**: Use neverthrow Result types (no throwing exceptions)
- **Validation**: Runtime validation with Effect Schema (`import { Schema } from "effect"`)
- **Package Manager**: pnpm 10.24.0
- **CLI実行**: `npx` ではなく `pnpm exec` を使うこと
- **コマンドが見つからない場合**: `command not found` になったら `devbox run <command>` で実行する。パッケージが足りなければ `devbox add` で追加する
- **コミット前チェック**: ユーザーが「コミット」を依頼したら、`git commit` の前に以下を実行すること
  1. `pnpm exec biome check --write <staged files>` (staged ファイルのみ lint + format)
  2. 変更があったパッケージのみ `pnpm exec tsc --noEmit` (型チェック)
  3. CLAUDE.md / README.md の内容が変更と整合しているか確認し、必要なら更新
  - 問題があれば修正してからコミットする
- **コミット後の自動PR**: コミット完了後、以下を自動実行する
  1. main ブランチ上なら、コミット内容に基づいたブランチ名（例: `feat/xxx`, `refactor/xxx`）を自動作成し、コミットをそのブランチに移動する
  2. `git push -u origin <branch>` でリモートに push
  3. そのブランチの PR が未作成なら `gh pr create` で PR を作成する（既存なら push のみ）

## Environment Variables

- Frontend: `JOB_STORE_ENDPOINT`
- API: `JWT_SECRET`, Cloudflare credentials
- Crawler: AWS credentials, queue URLs

## CI/CD

- `pr-checks.yml` - Build, type check, test, lint on PRs
- `deploy.yml` - AWS CDK deploy on push to main
- `run-lambda-weekly-days.yml` - Weekly crawler execution
