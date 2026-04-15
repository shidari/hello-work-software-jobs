# CLI ツール

このプロジェクトでは開発用 CLI（`nodejs` / `pnpm` / `gh` / `jq` / `aws` (awscli2) / `wrangler` / `vercel` / `@anthropic-ai/claude-code`）が **Apple container ベースのサンドボックス**に閉じ込められている（[Dockerfile](../../Dockerfile) / [scripts/sandbox.sh](../../scripts/sandbox.sh)）。**Claude Code もこのコンテナ内で実行する**。ホスト側のグローバル版は使わない。

## 起動

```bash
./scripts/sandbox.sh              # 引数なし: Claude Code をコンテナ内で起動
./scripts/sandbox.sh shell        # bash シェルに入る
./scripts/sandbox.sh <cmd> [...]  # 任意コマンドをコンテナ内で実行
./scripts/sandbox.sh stop         # 停止・破棄
```

コンテナ内ではすべての CLI が `PATH` に入っており、ホストの認証ディレクトリ（`~/.claude` / `~/.aws` / `~/.wrangler` / `~/.config/vercel` / `~/.config/gh`）がバインドマウントされる。Claude Code のセッション状態もホストと共有される。

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
| Collector | `aws logs` | `AWS_PROFILE=crawler-debug` |
| API (Workers) | `wrangler tail job-store` | `wrangler login` |
| Frontend (Vercel) | `vercel logs` | `vercel login` + `vercel link`（`apps/frontend/hello-work-job-searcher` で実行） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
