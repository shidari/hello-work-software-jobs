# Hello Work Software Jobs

ハローワーク求人情報の自動収集・管理システム（モノレポ構成）

**デモ**: https://my-hello-work-job-list-hello-work-j.vercel.app/

## プロジェクト構成

```
apps/
  ├── backend/
  │   ├── api/                      # Cloudflare Workers API (Hono + D1)
  │   └── collector/                # AWS Lambda クローラー (Playwright + SQS)
  │       └── infra/               # CDK IaC
  └── frontend/
      └── hello-work-job-searcher/  # Next.js フロントエンド
packages/
  ├── db/                           # Kysely + D1 client factory & types
  └── models/                       # 共通型定義
tools/
  └── hwctl/                        # Haskell admin CLI (Stack)
```

## 技術スタック

- **共通**: TypeScript, pnpm workspace
- **フロントエンド**: Next.js 16, React 19, Jotai, Hono (RPC)
- **API**: Cloudflare Workers, Hono, Kysely, D1
- **クローラー**: AWS Lambda (Docker), SQS, EventBridge, Playwright, Effect, CDK
- **型管理**: Effect Schema, @sho/models
- **Admin CLI**: Haskell (Stack), optparse-applicative, aeson, req

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 各パッケージの開発サーバー起動
cd apps/frontend/hello-work-job-searcher && pnpm dev   # フロントエンド (port 9002)
cd apps/backend/api && pnpm dev                        # API (port 8787)

# クローラー検証
cd apps/backend/collector
pnpm exec playwright install chromium
pnpm verify:e-t-crawler
pnpm verify:job-detail-extractor
```

## デプロイ

```bash
# クローラー (AWS CDK)
cd apps/backend/collector/infra
JOB_STORE_ENDPOINT=... API_KEY=... pnpm exec cdk deploy

# API (Cloudflare Workers)
cd apps/backend/api
pnpm deploy

# フロントエンド (Vercel)
cd apps/frontend/hello-work-job-searcher
pnpm build
```

## 環境変数

各プロジェクトで必要な環境変数は各ディレクトリのREADMEを参照してください。
