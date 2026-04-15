# CLI ツール

このプロジェクトでは開発用 CLI（`nodejs` / `pnpm` / `gh` / `jq` / `aws` (awscli2) / `wrangler` / `vercel` / `@anthropic-ai/claude-code`）が **Apple container ベースのサンドボックス**に閉じ込められている（[Dockerfile](../../Dockerfile) / [scripts/sandbox.sh](../../scripts/sandbox.sh)）。**Claude Code もこのコンテナ内で実行する**。ホスト側のグローバル版は使わない。

## 起動

```bash
./scripts/sandbox-create.sh  # image build + コンテナ作成（初回 or 破棄後）
./scripts/sandbox.sh         # 既存コンテナに bash で入る
./scripts/sandbox-stop.sh    # 停止・破棄
```

初回は `sandbox-create.sh` でセットアップ後、`sandbox.sh` で中に入って `gh auth login` / `wrangler login` / `vercel login` / `claude /login` を手動で実行する。

## 認証情報の扱い

ブラスト半径を最小化するため、ホストの認証情報は直接触らせない。方式は 2 つ:

| 方式 | 対象 | 理由 |
|------|------|------|
| `~/.sho-sandbox/` 以下を read-write bind mount | `gh` / `claude` / `wrangler` / `vercel` | コンテナ内で各 CLI の `login` を実行し、結果をホストから隔離して永続化。OAuth トークンリフレッシュのため書き込み可 |
| `~/.aws` を read-only マウント | `aws` | AWS CLI のプロファイル設定ファイルを参照するため。SSO ログインはホスト側で行う |

### 初回セットアップ

サンドボックス内でブラウザ OAuth を一度ずつ実行すれば、`~/.sho-sandbox/` に保存されて次回以降も有効:

```bash
./scripts/sandbox-create.sh   # 初回のみ: コンテナ作成
./scripts/sandbox.sh          # bash で中に入る
gh auth login       # ブラウザで GitHub 承認
wrangler login      # ブラウザで Cloudflare 承認
vercel login        # ブラウザで Vercel 承認
claude /login       # または `claude setup-token`
```

永続化パス:

| ツール | ホスト側 | コンテナ内 |
|--------|---------|-----------|
| `gh` | `~/.sho-sandbox/gh/` | `~/.config/gh/` |
| `claude` | `~/.sho-sandbox/claude/` | `~/.claude/` |
| `wrangler` | `~/.sho-sandbox/wrangler/` | `~/.config/.wrangler/` |
| `vercel` | `~/.sho-sandbox/vercel-data/`, `~/.sho-sandbox/vercel-config/` | `~/.local/share/com.vercel.cli/`, `~/.config/com.vercel.cli/` |

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
| API (Workers) | `wrangler tail job-store` | サンドボックス内で `wrangler login`（`~/.sho-sandbox/wrangler/` に永続化） |
| Frontend (Vercel) | `vercel logs` | サンドボックス内で `vercel login` + `vercel link`（`apps/frontend/hello-work-job-searcher` で実行、`.vercel/` はリポジトリ内に書かれる） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
