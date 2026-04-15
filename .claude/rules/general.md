# General

プロジェクト全体に適用されるルール。

## CLI ツール

Apple container サンドボックスで管理している CLI（`gh` / `aws` / `wrangler` / `vercel` 等）の一覧と実行方法は [.claude/rules/cli.md](./cli.md) を参照。

## ロギング

- 構造化ログのキー名規約は [docs/LOGGING.md](../../docs/LOGGING.md) を参照
- 失敗ログには **必ず** `service` / `_tag` / `jobNumber`（該当時）を含める
- 横断デバッグは `/debug` skill を使う
