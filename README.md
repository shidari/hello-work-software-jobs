# Hello Work Software Jobs

ハローワーク求人情報の自動収集・管理システム（モノレポ構成）

**デモ**: https://my-hello-work-job-list-hello-work-j.vercel.app/

## プロジェクト構成

```
apps/
  ├── backend/
  │   ├── api/                      # Cloudflare Workers API (Hono + D1)
  │   └── collector/                # GCP Cloud Run クローラー (Playwright + Pub/Sub)
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
- **クローラー**: GCP Cloud Run, Playwright, Pub/Sub, Effect
- **型管理**: Effect Schema, @sho/models
- **Admin CLI**: Haskell (Stack), optparse-applicative, aeson, req

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 各パッケージの開発サーバー起動
cd apps/frontend/hello-work-job-searcher && pnpm dev   # フロントエンド (port 9002)
cd apps/backend/api && pnpm dev                        # API (port 8787)

# クローラー検証 (ローカル)
cd apps/backend/collector
docker-compose up  # Pub/Sub エミュレータ + Collector
```

## デプロイ

```bash
# クローラー (GCP Cloud Run)
cd apps/backend/collector
# gcloud run deploy でデプロイ

# API (Cloudflare Workers)
cd apps/backend/api
pnpm deploy

# フロントエンド (Vercel)
cd apps/frontend/hello-work-job-searcher
pnpm build
```

## 環境変数

各プロジェクトで必要な環境変数は各ディレクトリのREADMEを参照してください。
