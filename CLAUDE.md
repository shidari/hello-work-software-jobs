# CLAUDE.md

This file provides guidance for Claude Code to understand this repository.

## Project Overview

A monorepo application for collecting, managing, and searching Hello Work (Japanese job center) job listings.

## Documentation

- [AGENTS.md](AGENTS.md) — AI エージェント行動指針
- [ARCHITECTURE.md](ARCHITECTURE.md) — アーキテクチャ全体像
- [docs/FRONTEND.md](docs/FRONTEND.md) — フロントエンド設計
- [docs/QUALITY.md](docs/QUALITY.md) — テスト・品質方針
- [docs/SECURITY.md](docs/SECURITY.md) — セキュリティ方針
- [docs/references/conventions.md](docs/references/conventions.md) — コーディング規約・PR ルール

## Rules (パッケージスコープ)

- [.claude/rules/api.md](.claude/rules/api.md) — API 固有ルール
- [.claude/rules/frontend.md](.claude/rules/frontend.md) — Frontend 固有ルール
- [.claude/rules/collector.md](.claude/rules/collector.md) — Collector 固有ルール
- [.claude/rules/db.md](.claude/rules/db.md) — DB 固有ルール
- [.claude/rules/models.md](.claude/rules/models.md) — Models 固有ルール
- [.claude/rules/general.md](.claude/rules/general.md) — 全体共通ルール（devbox 等）

## Skills

- `/commit-and-pr` — コミット → PR 作成の自動化
- `/pentest` — 攻撃者視点のペネトレーションテスト
- `/crawler-diagnose` — クローラーパイプライン診断

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

# 診断は /crawler-diagnose skill を使用
```
