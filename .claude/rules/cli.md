# CLI ツール

このプロジェクトでは **`nodejs` / `pnpm` / `gh` / `pinact` / `jq` / `aws` (awscli2) / `wrangler` / `vercel` が devbox で管理されている**（[devbox.json](../../devbox.json)）。これらは `devbox run <command>` 経由で実行し、グローバル版を直接叩かない。

## 用途

| ツール | 用途 |
|------|------|
| `nodejs` | ランタイム（v22） |
| `pnpm` | パッケージマネージャ・monorepo タスクランナー |
| `gh` | GitHub CLI（PR・issue、`/commit-and-pr` skill が利用） |
| `pinact` | GitHub Actions の SHA ピン止め |
| `jq` | JSON 整形（`aws logs` / `wrangler tail` のパイプ処理） |
| `aws` | Collector ログ・Lambda 診断 |
| `wrangler` | Cloudflare Workers（API デプロイ・D1・tail） |
| `vercel` | Vercel（Frontend ログ・デプロイ確認） |

## ログ取得 CLI 認証

3 基盤のログを CLI から取得するための認証前提:

| 基盤 | CLI | 認証 |
|------|-----|------|
| Collector | `aws logs` | `AWS_PROFILE=crawler-debug` |
| API (Workers) | `wrangler tail job-store` | `devbox run wrangler login` |
| Frontend (Vercel) | `vercel logs` | `devbox run vercel login` + `devbox run vercel link`（`apps/frontend/hello-work-job-searcher` で実行） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
