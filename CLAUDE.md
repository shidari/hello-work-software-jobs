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

# Admin CLI (tools/hwctl)
stack build                       # Build
stack exec hwctl -- jobs list     # List jobs (JSON)
stack exec hwctl -- jobs get ID   # Get job by number (JSON)
stack exec hwctl -- stats daily   # Daily stats (JSON, filter with JSON arg)
stack exec hwctl -- queue status  # Queue status (JSON)
stack exec hwctl -- logs tail     # Create tail session (JSON)
stack exec hwctl -- crawler run [OPTIONS_JSON]  # Trigger crawler (e.g., '{"period":"week","maxCount":50}')
stack exec hwctl -- crawler history [FILTER_JSON]  # Crawler run history (JSON filter: since, until, status, trigger, limit)
stack exec hwctl -- job-detail history [FILTER_JSON]  # Job detail ETL run history (JSON filter: since, until, status, limit)
stack exec hwctl -- queue dlq [--table]  # DLQ status (JSON)
stack exec hwctl -- queue dlq-pull [--batch-size N]  # DLQ messages pull (JSON)
stack exec hwctl -- job-detail run JOB_NUMBER  # Send job number to ETL queue
```
