# General

プロジェクト全体に適用されるルール。

## CLI ツール

Apple container サンドボックスで管理している CLI（`gh` / `aws` / `wrangler` / `vercel` 等）の一覧と実行方法は [.claude/rules/cli.md](./cli.md) を参照。

## ロギング

- 構造化ログのキー名規約は [docs/LOGGING.md](../../docs/LOGGING.md) を参照
- 失敗ログには **必ず** `service` / `_tag` / `jobNumber`（該当時）を含める
- 横断デバッグは `/debug` skill を使う

## ワンショットスクリプト実行

調査・検証用の使い捨てワンライナー / 短いスクリプトは `node -e` ではなく **`deno eval`** を使う。Deno はデフォルトで権限ゼロなので、必要な権限だけを `--allow-*` で明示する（コンテナ内でもう一段の最小権限境界）。

| 用途 | コマンド例 |
|------|-----------|
| 純粋計算・文字列処理 | `deno eval "..."`（権限なし） |
| ファイル読むだけ | `deno eval --allow-read=. "..."` |
| 外部 API 叩く | `deno eval --allow-net=api.example.com "..."` |
| 環境変数を読む | `deno eval --allow-env=FOO "..."` |

**棲み分け**: Deno はあくまで「リポジトリのコードに繋がらない単発スクリプト」専用。リポジトリ内パッケージ（`@sho/*`）を import する検証や `apps/`・`packages/` 配下に永続的に置くスクリプトは、pnpm workspace 解決のため `tsx scripts/foo.ts` を使う。
