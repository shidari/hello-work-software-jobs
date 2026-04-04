# CLAUDE.md

This file provides guidance for Claude Code to understand this repository.

## Project Overview

A monorepo application for collecting, managing, and searching Hello Work (Japanese job center) job listings.

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
pnpm storybook         # Storybook dev server (port 6006)
pnpm build-storybook   # Storybook ビルド

# API (apps/backend/api)
pnpm dev               # Wrangler dev server (port 8787)
pnpm deploy            # Deploy to Cloudflare
pnpm test              # Vitest tests
pnpm migrate           # D1 マイグレーション適用（本番）
pnpm migrate:local     # D1 マイグレーション適用（ローカル）

# Crawler (apps/backend/collector)
pnpm dev:docker-up     # docker-compose up (LocalStack + Lambda)
pnpm dev:docker-down   # docker-compose down
pnpm dev:invoke-crawler  # 求人番号クローラー手動実行
pnpm dev:invoke-detail   # 求人詳細 ETL 手動実行
pnpm dev:e2e             # E2E パイプライン検証 (crawler → SQS → ETL → API)
pnpm test              # Vitest tests (PBT)
pnpm build             # tsdown ビルド

# 診断スクリプト (AWS_PROFILE=crawler-debug が必要)
devbox run crawler-diagnose          # クローラーパイプライン全体診断
devbox run crawler-logs [DAYS]       # 直近 N 日のエラーログ (デフォルト 3 日)
```
