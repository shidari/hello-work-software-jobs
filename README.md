# Hello Work Software Jobs

ハローワーク求人情報の自動収集・管理システム（モノレポ構成）

**デモ**: https://my-hello-work-job-list-hello-work-j.vercel.app/

## プロジェクト構成

```
apps/
  ├── backend/
  │   ├── job-store-api/            # Cloudflare Workers API (Hono + D1)
  │   └── headless-crawler/         # AWS Lambda クローラー (Playwright)
  └── frontend/
      └── hello-work-job-searcher/  # Next.js フロントエンド
packages/
  ├── db/                           # Kysely types (generated from schema.sql)
  └── models/                       # 共通型定義
```

## 技術スタック

- **共通**: TypeScript, pnpm workspace
- **フロントエンド**: Next.js 16, React 19, Jotai, Hono (RPC)
- **API**: Cloudflare Workers, Hono, Kysely, D1
- **クローラー**: AWS Lambda, Playwright, Effect, SQS
- **型管理**: Effect Schema, @sho/models

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 各パッケージの開発サーバー起動
cd apps/frontend/hello-work-job-searcher && pnpm dev   # フロントエンド (port 9002)
cd apps/backend/job-store-api && pnpm dev              # API (port 8787)

# クローラー検証
cd apps/backend/headless-crawler
pnpm exec playwright install chromium
pnpm verify:e-t-crawler
pnpm verify:job-detail-extractor
```

## デプロイ

```bash
# クローラー (AWS Lambda)
cd apps/backend/headless-crawler
pnpm bootstrap  # 初回のみ
pnpm deploy

# API (Cloudflare Workers)
cd apps/backend/job-store-api
pnpm deploy

# フロントエンド (Vercel)
cd apps/frontend/hello-work-job-searcher
pnpm build
```

## 環境変数

各プロジェクトで必要な環境変数は各ディレクトリのREADMEを参照してください。
