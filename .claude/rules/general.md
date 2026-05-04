# General

プロジェクト全体に適用されるルール。

## CLI ツール

Apple container サンドボックスで管理している CLI（`gh` / `aws` / `wrangler` / `vercel` 等）の一覧と実行方法は [.claude/rules/cli.md](./cli.md) を参照。

## ロギング

- 構造化ログのキー名規約は [docs/LOGGING.md](../../docs/LOGGING.md) を参照
- 失敗ログには **必ず** `service` / `_tag` / `jobNumber`（該当時）を含める
- 横断デバッグは `/debug` skill を使う

## ワンショットスクリプト実行

調査・検証用の使い捨てワンライナー / 短いスクリプトは `node -e` ではなく **`deno eval`** を使う。Deno はデフォルトで権限ゼロなので、コンテナ内でもう一段の最小権限境界が引ける。

**まず `--allow-*` を一切付けずに書く**。実行して `PermissionDenied` が出たら、出たエラーが指す権限だけを `--allow-X=<最小スコープ>` で足す。最初から「たぶん要る」で許可を盛らない。

| 用途 | コマンド例 |
|------|-----------|
| 純粋計算・文字列処理 | `deno eval "..."`（権限なし、デフォルト） |
| ファイル読むだけ | `deno eval --allow-read=. "..."` |
| 外部 API 叩く | `deno eval --allow-net=api.example.com "..."` |
| 環境変数を読む | `deno eval --allow-env=FOO "..."` |

**Read / Edit / Write tool で済む場合は deno を呼ばない**。単一ファイルの読み書きや JSON の中身を見るだけなら専用 tool の方が安全で速い。deno は「ロジック付きの処理（複数ファイル走査・集計・変換）」が必要になったときだけ。

**棲み分け**: Deno はあくまで「リポジトリのコードに繋がらない単発スクリプト」専用。リポジトリ内パッケージ（`@sho/*`）を import する検証や `apps/`・`packages/` 配下に永続的に置くスクリプトは、pnpm workspace 解決のため `tsx scripts/foo.ts` を使う。
