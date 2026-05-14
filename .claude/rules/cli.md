# CLI ツール

このプロジェクトでは開発用 CLI（`nodejs` / `pnpm` / `deno` / `gh` / `jq` / `wrangler` / `vercel` / `@anthropic-ai/claude-code`）が **Apple container ベースの dev サンドボックス** (`sho-sandbox`) に閉じ込められている。OCI image は **nix の `dockerTools.buildLayeredImage`** で組み立てる（[flake.nix](../../flake.nix) / [scripts/sandbox.sh](../../scripts/sandbox.sh)）。**Claude Code もこのコンテナ内で実行する**。ホスト側のグローバル版は使わない。

実 AWS への到達経路は dev サンドボックスからは外している。`aws` CLI は flake から削除済みで、`~/.aws` の mount も無い。CloudWatch / SQS / Lambda / EventBridge 等は **ops サンドボックス** (`sho-mcp-ops`) 側に閉じた MCP server（`ops-aws-cloudwatch` / `ops-aws-api`、いずれも read-only）経由で読む。詳細は後段の「MCP ops コンテナ」節を参照。

## 構成

| 層 | 何をするか |
|------|-----------|
| `flake.nix` | aarch64-linux 用の OCI image 定義。chromium / nodejs / pnpm / gh / deno / jq / openssh / cacert 等を contents に列挙（awscli は意図的に除外） |
| `package.json` (root devDependencies) | `@anthropic-ai/claude-code` / `wrangler` / `vercel` は npm 配布物なので nix を経由せず pnpm 管理。container 内で `pnpm install` すると `/work/node_modules/.bin` に展開され、image の PATH に組み込まれる |
| `scripts/sandbox-image.sh` | nix build → skopeo で OCI archive 化 → `container image load` → smoke test → 旧 container 破棄 → 新 image で container 再作成までを 1 本で実行 |
| `scripts/sandbox.sh` | container を作成・起動して `/bin/bash` を投げる。`--ensure-up` で起動だけして抜ける（direnv 用）。**main repo の host 絶対 path で self-mount** するので worktree から呼んでも main を mount し、worktree の `.git` ファイル参照（host 絶対 path）が container 内でも resolve する。`/work` は `$REPO` への symlink として提供（image の PATH=/work/node_modules/.bin 互換用） |
| `scripts/sandbox-stop.sh` | 停止 + 破棄（image rebuild なしで一旦 sandbox を消したい時の ad-hoc cleanup 用） |
| `.envrc` | direnv が repo `cd` 時に `sandbox.sh --ensure-up` を呼ぶ |

## 前提（ホスト macOS）

- **`nix-darwin` + `nix.linux-builder.enable = true`**
  aarch64-darwin から aarch64-linux derivation を build するため。VM が `/Library/LaunchDaemons/org.nixos.linux-builder.plist` で常駐
- **Apple `container` CLI**（https://github.com/apple/container）
- **direnv**（任意、`brew install direnv` + `direnv allow` で repo 入室時に自動 up）

## 起動

```bash
./scripts/sandbox-image.sh   # 初回 or flake.nix 更新時。nix build → smoke test → container 再作成まで 1 本で実行（5〜30 分、cache が効けば 5 分前後）
./scripts/sandbox.sh         # 既存 container に bash で入る（image はそのまま、中身だけ触りたい時）
./scripts/sandbox-stop.sh    # 停止・破棄（ad-hoc cleanup）
```

direnv 経由なら `cd ~/path/to/repo` で container が自動 up（`sandbox-image.sh` は依然手動）。

初回は `sandbox.sh` で中に入った後 `pnpm install` を 1 度叩く（root devDeps の wrangler / vercel / claude-code を `/work/node_modules/.bin` に展開）。その後で `gh auth login` / `wrangler login` / `vercel login` / `claude /login` をブラウザ OAuth で。

## 認証情報の扱い

ブラスト半径を最小化するため、ホストの認証情報は直接触らせない。dev サンドボックスは `~/.sho-sandbox/` 以下を read-write bind mount し、コンテナ内で各 CLI の `login` を実行する。OAuth トークンリフレッシュのため書き込み可。

AWS credentials は dev サンドボックスには mount しない（aws CLI 自体を撤去済み）。実 AWS への到達は ops サンドボックス側の MCP server に閉じる（後段「MCP ops コンテナ」節）。

永続化パス（image は `HOME=/root` 指定で Apple container も runtime をそのまま root で起動するので `/root/...` にマウント）:

| ツール | ホスト側 | コンテナ内 |
|--------|---------|-----------|
| `gh` | `~/.sho-sandbox/gh/` | `/root/.config/gh/` |
| `claude` | `~/.sho-sandbox/claude/` | `/root/.claude/` |
| `wrangler` | `~/.sho-sandbox/wrangler/` | `/root/.config/.wrangler/` |
| `vercel` | `~/.sho-sandbox/vercel-data/`, `~/.sho-sandbox/vercel-config/` | `/root/.local/share/com.vercel.cli/`, `/root/.config/com.vercel.cli/` |
| `vscode-server` | `~/.sho-sandbox/vscode-server/` | `/root/.vscode-server/` |

## image を更新したい時

```bash
# flake.nix を編集（package を追加 / 削る等）
./scripts/sandbox-image.sh   # build → smoke test → 旧 container 破棄 → 新 image で再作成 を 1 本で
```

`buildLayeredImage` は path 単位の content-addressed layer なので、変わってない layer は cache から再利用される（差分 layer のみ作り直し）。

## 用途

| ツール | 由来 | 用途 |
|------|------|------|
| `nodejs` | nix (`nodejs_24`) | ランタイム |
| `pnpm` | nix | パッケージマネージャ・monorepo タスクランナー |
| `deno` | nix | 使い捨てワンショットスクリプト用（`node -e` の代替）。permission 制御で最小権限を明示。詳細は [.claude/rules/general.md](./general.md) |
| `gh` | nix | GitHub CLI（PR・issue、`/commit-and-pr` skill が利用） |
| `jq` | nix | JSON 整形（`wrangler tail` 等のパイプ処理） |
| `claude` | pnpm (`@anthropic-ai/claude-code`) | Claude Code |
| `wrangler` | pnpm | Cloudflare Workers（API デプロイ・D1・tail） |
| `vercel` | pnpm | Vercel（Frontend ログ・デプロイ確認） |
| chromium | nix (`playwright-driver.browsers-chromium`) | Crawler の Playwright が呼び出す。`PLAYWRIGHT_BROWSERS_PATH` で image 内 path に固定済み |

実 AWS API への直接アクセスは dev サンドボックスからは出来ない（awscli 撤去）。代わりに ops サンドボックス側の MCP server を使う（後段「MCP ops コンテナ」節）。LocalStack は docker compose の localstack service に同梱されている `awslocal` を `docker compose exec` 経由で叩く（[apps/backend/collector/infra/local/e2e.sh](../../apps/backend/collector/infra/local/e2e.sh) 参照）。

## ログ取得 CLI 認証

3 基盤のログ取得の前提:

| 基盤 | 経路 | 認証 |
|------|-----|------|
| Collector | `ops-aws-cloudwatch` MCP（`execute_log_insights_query` 等） | host の `~/.aws/{config,credentials,sso/cache}` を ops コンテナが起動時に `~/.sho-mcp-ops/aws/` にスナップショットして mount。`AWS_PROFILE=crawler-debug` は ops 側 env で固定。SSO profile を使う場合は `aws sso login` 後に ops を再起動して cache を取り直す |
| API (Workers) | `wrangler tail job-store` | サンドボックス内で `wrangler login`（`~/.sho-sandbox/wrangler/` に永続化） |
| Frontend (Vercel) | `vercel logs` | サンドボックス内で `vercel login` + `vercel link`（`apps/frontend/hello-work-job-searcher` で実行、`.vercel/` はリポジトリ内に書かれる） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。Collector 系で MCP が認証エラーを返すなら、host で `aws sso login --profile crawler-debug` を打ってから `./scripts/ops-sandbox.sh --stop && ./scripts/ops-sandbox.sh` で snapshot を取り直す。

## MCP ops コンテナ (sho-mcp-ops)

dev sandbox とは別に、GitHub / AWS の MCP server を expose するための **ops コンテナ**を `sho-mcp-net` という private network 上で動かす。Claude (dev sandbox = `sho-sandbox`) は同 network から SSE でアクセスする。token / AWS credentials は ops コンテナだけが持ち、dev sandbox からは直接見えない。

| 層 | 何をするか |
|------|-----------|
| `packages/mcp-ops/flake.nix` | aarch64-linux 用の OCI image 定義。bash / curl / python3 / uv / tini / libstdc++ 等 minimal セット |
| `packages/mcp-ops/start.sh` | image の Cmd。`github-mcp-server` (Go, `--read-only`) と `awslabs.cloudwatch-mcp-server` / `awslabs.aws-api-mcp-server` (Python via uvx、いずれも read-only) を `mcp-proxy` で stdio→SSE 化して 7001 / 7002 / 7003 で listen |
| `scripts/ops-sandbox-image.sh` | nix build → OCI archive → `container image load` → smoke test → ops container 再作成 まで 1 本 |
| `scripts/ops-sandbox.sh` | ops コンテナの起動 / 停止 / ログ。起動時に macOS Keychain から PAT を取り出し、bind mount 用の一時 file に書き出す。`~/.aws/{config,credentials,sso/cache}` も `~/.sho-mcp-ops/aws/` に snapshot して mount する（SSO 利用時は token cache が必須） |
| `.mcp.json` | project レベル MCP 設定。`sho-mcp-net` 上の hostname `sho-mcp-ops` の SSE endpoint を `ops-github` / `ops-aws-cloudwatch` / `ops-aws-api` として登録 |

ops コンテナが expose する MCP server:

| port | server | 役割 | 認可 |
|------|--------|------|------|
| 7001 | `github-mcp-server` | GitHub の issue / PR / actions / repos を read-only で参照 | PAT、`--read-only` で write tool 無効化 |
| 7002 | `awslabs.cloudwatch-mcp-server` | CloudWatch Logs / Metrics の問い合わせ | `AWS_PROFILE=crawler-debug` |
| 7003 | `awslabs.aws-api-mcp-server` | 汎用 AWS API（SQS / Lambda / EventBridge 等）。dev sandbox から awscli を撤去した代わり | `AWS_PROFILE=crawler-debug` + `READ_OPERATIONS_ONLY=true` で書き込み拒否 |

### GitHub PAT の保存（macOS Keychain）

fine-grained PAT (`Contents:Read` / `Pull requests:RW` / `Issues:R` / `Actions:R`) を発行して Keychain に保存する:

```bash
security add-generic-password -s sho-mcp-ops -a github-pat -T /usr/bin/security -w
# プロンプトに PAT を貼り付け（履歴にも argv にも残らない）
```

`-T /usr/bin/security` を付けることで `security find-generic-password` 経由の取り出しが GUI prompt なしで通る。`ops-sandbox.sh` がこの経路で起動毎に取り出して `~/.sho-mcp-ops/github-pat` に書き、container 内 `/run/secrets/github-pat` として bind mount する。`--stop` で破棄。

### 起動

```bash
./scripts/ops-sandbox-image.sh   # 初回 or flake.nix 更新時。nix build → smoke → ops container 再作成
./scripts/ops-sandbox.sh         # 既に image があれば ops container を ensure-up（毎回 Keychain から PAT を取り直す）
./scripts/ops-sandbox.sh --stop  # 停止 + 削除 + 一時 PAT file 破棄
```

`./scripts/sandbox.sh` は ops が同 `sho-mcp-net` 上に居れば、起動時に ops の IP を dev sandbox の `/etc/hosts` に書き込んで `sho-mcp-ops` を resolve 可能にする（Apple container CLI 0.11.0 時点で builtin DNS が同 network 上の hostname を解決しないため）。
