# CLI ツール

このプロジェクトでは **`nodejs` / `pnpm` / `gh` / `pinact` / `jq` / `aws` (awscli2) / `wrangler` / `vercel` が Nix flake で管理されている**（[flake.nix](../../flake.nix)）。`nix develop --command <command>` 経由で単発実行するか、`nix develop` でシェルに入ってから直接叩く。グローバル版を直接叩かない。

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
| API (Workers) | `wrangler tail job-store` | `nix develop --command wrangler login` |
| Frontend (Vercel) | `vercel logs` | `nix develop --command vercel login` + `nix develop --command vercel link`（`apps/frontend/hello-work-job-searcher` で実行） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
