# General

プロジェクト全体に適用されるルール。

## devbox

- CLI ツール（`gh`, `awscli`, `vercel`, `wrangler` 等）は devbox で管理されている
- コマンドが見つからない場合は `devbox run <command>` で実行する
- インストール済みツールは `devbox.json` を参照

## ロギング

- 構造化ログのキー名規約は [docs/LOGGING.md](../../docs/LOGGING.md) を参照
- 失敗ログには **必ず** `service` / `_tag` / `jobNumber`（該当時）を含める
- 横断デバッグは `/debug` skill を使う

## ログ取得 CLI 認証

3 基盤のログを CLI から取得するための認証前提:

| 基盤 | CLI | 認証 |
|------|-----|------|
| Collector | `aws logs` | `AWS_PROFILE=crawler-debug` |
| API (Workers) | `wrangler tail job-store` | `wrangler login` |
| Frontend (Vercel) | `vercel logs` | `vercel login` + `vercel link` (apps/frontend/hello-work-job-searcher で実行) |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
