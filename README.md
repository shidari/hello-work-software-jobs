# Hello Work Software Jobs

ハローワーク求人情報の自動収集・管理システム（モノレポ構成）

**デモ**: https://my-hello-work-job-list-hello-work-j.vercel.app/

## プロジェクト構成

```
apps/
  ├── backend/
  │   ├── api/                      # Cloudflare Workers API (Hono + D1)
  │   └── collector/                # クローラー (Playwright + Effect)
  │       └── infra/               # AWS インフラ (CDK: Lambda, SQS, EventBridge)
  └── frontend/
      └── hello-work-job-searcher/  # Next.js フロントエンド
packages/
  ├── db/                           # Kysely + D1 client factory & types
  ├── logger/                       # 3 サービス横断の構造化ログライブラリ
  ├── models/                       # ドメインモデル定義
  └── mcp-ops/                      # ops MCP container (GitHub / CloudWatch / AWS API)
scripts/                            # dev / ops Apple container サンドボックス管理
```

## 技術スタック

- **共通**: TypeScript, pnpm workspace
- **フロントエンド**: Next.js 16, React 19, Jotai, Hono (RPC), Storybook 10
- **API**: Cloudflare Workers, Hono, Kysely, D1
- **クローラー**: AWS Lambda (Docker), SQS, EventBridge, Playwright, Effect, CDK
- **型管理**: Effect Schema, @sho/models
- **ロギング**: @sho/logger（3 サービス共通の構造化ログ）
- **診断**: `/crawler-diagnose` / `/debug` skill + ops MCP（GitHub / AWS API / CloudWatch）/ wrangler / vercel / jq

## セットアップ

開発用 CLI（`pnpm` / `gh` / `wrangler` / `vercel` / `claude` 等）は **Apple container ベースの dev サンドボックス** (`sho-sandbox`) に閉じ込めています。実 AWS への到達経路は dev からは外し、別の **ops サンドボックス** (`sho-mcp-ops`) に閉じた MCP server（GitHub / AWS API / CloudWatch）経由のみとしています。詳細は [.claude/rules/cli.md](.claude/rules/cli.md) 参照。

```bash
# dev サンドボックス（初回 or flake.nix 更新時）
./scripts/sandbox-image.sh   # image build + smoke test + container 再作成
./scripts/sandbox.sh         # 以後はこれでコンテナに入る（direnv 入れていれば自動 up）

# ops サンドボックス（GitHub / AWS の MCP server を上げる、初回 or flake.nix 更新時）
./scripts/ops-sandbox-image.sh   # image build + container 再作成
./scripts/ops-sandbox.sh         # 通常起動（Keychain から GitHub PAT を取り直す）

# 以下はサンドボックス内で実行
pnpm install                # 依存関係インストール

# 各パッケージの開発サーバー
cd apps/frontend/hello-work-job-searcher && pnpm dev            # (port 9002)
cd apps/frontend/hello-work-job-searcher && pnpm storybook      # (port 6006)
cd apps/backend/api && pnpm dev                                 # (port 8787)

# クローラー検証（ローカル Docker パイプライン）— host shell で実行
cd apps/backend/collector
pnpm dev:docker-up                  # docker compose で Lambda + LocalStack 起動
pnpm dev:invoke-crawler              # 求人番号クローラー手動実行
pnpm dev:invoke-detail               # 求人詳細 ETL 手動実行
pnpm dev:e2e                         # E2E パイプライン検証（localstack 内蔵 awslocal を使う）

# 単発のクローラー動作確認（実サイトに対するスモーク）— サンドボックス内
pnpm dev:verify-job-number-crawler
pnpm dev:verify-job-detail-crawler
pnpm dev:verify-detail-search
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
