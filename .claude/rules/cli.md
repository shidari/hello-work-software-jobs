# CLI ツール

このプロジェクトでは開発用 CLI（`nodejs` / `pnpm` / `gh` / `jq` / `aws` (awscli2) / `wrangler` / `vercel` / `@anthropic-ai/claude-code`）が **Apple container ベースのサンドボックス**に閉じ込められている（[Dockerfile](../../Dockerfile) / [scripts/sandbox.sh](../../scripts/sandbox.sh)）。**Claude Code もこのコンテナ内で実行する**。ホスト側のグローバル版は使わない。

## 初回セットアップ

```bash
cp .env.sandbox.example .env.sandbox
# エディタで .env.sandbox を開き、各 PAT/トークンを記入する
```

## 起動

```bash
./scripts/sandbox.sh              # 引数なし: Claude Code をコンテナ内で起動
./scripts/sandbox.sh shell        # bash シェルに入る
./scripts/sandbox.sh <cmd> [...]  # 任意コマンドをコンテナ内で実行
./scripts/sandbox.sh stop         # 停止・破棄
```

## 認証情報の扱い

ブラスト半径を最小化するため、マウントは最小限に留め、基本は環境変数で渡す。

| 方式 | 対象 | 理由 |
|------|------|------|
| 環境変数（`.env.sandbox` → `--env-file`） | `gh` / `wrangler` / `vercel` / `claude` | PAT/API Token で完結。scope を絞れる |
| read-only マウント | `~/.aws` | AWS CLI はプロファイル設定ファイル（`config` / `credentials`）を参照するため |

環境変数は以下を使う（`.env.sandbox.example` 参照）:

| ツール | 環境変数 |
|--------|---------|
| `gh` | `GH_TOKEN` |
| `wrangler` | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` |
| `vercel` | `VERCEL_TOKEN` |
| `claude` | `CLAUDE_CODE_OAUTH_TOKEN` もしくは `ANTHROPIC_API_KEY` |

`aws` のログイン操作（アクセスキー設定など）はホスト側で行い、コンテナは `~/.aws` を read-only で参照する方針。

## 用途

| ツール | 用途 |
|------|------|
| `nodejs` | ランタイム（Dockerfile の `node:24-bookworm-slim`） |
| `pnpm` | パッケージマネージャ・monorepo タスクランナー（corepack 経由） |
| `claude` | Claude Code（`@anthropic-ai/claude-code`） |
| `gh` | GitHub CLI（PR・issue、`/commit-and-pr` skill が利用） |
| `jq` | JSON 整形（`aws logs` / `wrangler tail` のパイプ処理） |
| `aws` | Collector ログ・Lambda 診断 |
| `wrangler` | Cloudflare Workers（API デプロイ・D1・tail） |
| `vercel` | Vercel（Frontend ログ・デプロイ確認） |

## ログ取得 CLI 認証

3 基盤のログを CLI から取得するための認証前提（すべてサンドボックス内で実行）:

| 基盤 | CLI | 認証 |
|------|-----|------|
| Collector | `aws logs` | `AWS_PROFILE=crawler-debug`（`~/.aws` はホスト側で整備） |
| API (Workers) | `wrangler tail job-store` | `.env.sandbox` の `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` |
| Frontend (Vercel) | `vercel logs` | `.env.sandbox` の `VERCEL_TOKEN` + `vercel link`（`apps/frontend/hello-work-job-searcher` で実行、`.vercel/` はリポジトリ内に書かれる） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
