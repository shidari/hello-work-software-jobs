# CLI ツール

このプロジェクトでは開発用 CLI（`nodejs` / `pnpm` / `deno` / `gh` / `jq` / `aws` (awscli2) / `wrangler` / `vercel` / `@anthropic-ai/claude-code`）が **Apple container ベースのサンドボックス**に閉じ込められている。OCI image は **nix の `dockerTools.buildLayeredImage`** で組み立てる（[flake.nix](../../flake.nix) / [scripts/sandbox.sh](../../scripts/sandbox.sh)）。**Claude Code もこのコンテナ内で実行する**。ホスト側のグローバル版は使わない。

## 構成

| 層 | 何をするか |
|------|-----------|
| `flake.nix` | aarch64-linux 用の OCI image 定義。chromium / nodejs / pnpm / gh / awscli2 / deno / jq / openssh / cacert 等を contents に列挙 |
| `package.json` (root devDependencies) | `@anthropic-ai/claude-code` / `wrangler` / `vercel` は npm 配布物なので nix を経由せず pnpm 管理。container 内で `pnpm install` すると `/work/node_modules/.bin` に展開され、image の PATH に組み込まれる |
| `scripts/sandbox-image.sh` | nix build → skopeo で OCI archive 化 → `container image load` のラッパ |
| `scripts/sandbox.sh` | container を作成・起動して `/bin/bash` を投げる。`--ensure-up` で起動だけして抜ける（direnv 用） |
| `scripts/sandbox-stop.sh` | 停止 + 破棄 |
| `.envrc` | direnv が repo `cd` 時に `sandbox.sh --ensure-up` を呼ぶ |

## 前提（ホスト macOS）

- **`nix-darwin` + `nix.linux-builder.enable = true`**
  aarch64-darwin から aarch64-linux derivation を build するため。VM が `/Library/LaunchDaemons/org.nixos.linux-builder.plist` で常駐
- **Apple `container` CLI**（https://github.com/apple/container）
- **direnv**（任意、`brew install direnv` + `direnv allow` で repo 入室時に自動 up）

## 起動

```bash
./scripts/sandbox-image.sh   # 初回 or flake.nix 更新時のみ。VM 経由で nix build → load（10〜30 分）
./scripts/sandbox.sh         # コンテナ作成（初回）+ 起動 + bash 投入
./scripts/sandbox-stop.sh    # 停止・破棄
```

direnv 経由なら `cd ~/path/to/repo` で container が自動 up（`sandbox-image.sh` は依然手動）。

初回は `sandbox.sh` で中に入った後 `pnpm install` を 1 度叩く（root devDeps の wrangler / vercel / claude-code を `/work/node_modules/.bin` に展開）。その後で `gh auth login` / `wrangler login` / `vercel login` / `claude /login` をブラウザ OAuth で。

## 認証情報の扱い

ブラスト半径を最小化するため、ホストの認証情報は直接触らせない。方式は 2 つ:

| 方式 | 対象 | 理由 |
|------|------|------|
| `~/.sho-sandbox/` 以下を read-write bind mount | `gh` / `claude` / `wrangler` / `vercel` | コンテナ内で各 CLI の `login` を実行し、結果をホストから隔離して永続化。OAuth トークンリフレッシュのため書き込み可 |
| `~/.aws/{config,credentials}` を `~/.sho-sandbox/aws/` にスナップショット → rw マウント | `aws` | ホストを source of truth にしつつ、cache 書き込みはコンテナに閉じる。snapshot は `sandbox.sh` 起動時に毎回再 sync するので、ホスト config の変更は次回 `cd`（direnv `--ensure-up`）で反映される。`aws sso login` もコンテナ内で実行 |

永続化パス（image は `HOME=/root` 指定だが Apple container により runtime user `node` (UID 1000) の `/home/node` に上書きされる。コンテナ側 path は明示的に `/home/node/...` でマウント）:

| ツール | ホスト側 | コンテナ内 |
|--------|---------|-----------|
| `gh` | `~/.sho-sandbox/gh/` | `/home/node/.config/gh/` |
| `claude` | `~/.sho-sandbox/claude/` | `/home/node/.claude/` |
| `wrangler` | `~/.sho-sandbox/wrangler/` | `/home/node/.config/.wrangler/` |
| `vercel` | `~/.sho-sandbox/vercel-data/`, `~/.sho-sandbox/vercel-config/` | `/home/node/.local/share/com.vercel.cli/`, `/home/node/.config/com.vercel.cli/` |
| `vscode-server` | `~/.sho-sandbox/vscode-server/` | `/home/node/.vscode-server/` |
| `aws` | `~/.sho-sandbox/aws/`（host config を毎回 snapshot + cache が rw で書かれる） | `/home/node/.aws/` |

## image を更新したい時

```bash
# flake.nix を編集（package を追加 / 削る等）
./scripts/sandbox-image.sh   # rebuild + reload
./scripts/sandbox-stop.sh    # 旧 container を破棄
./scripts/sandbox.sh         # 新 image で container 再作成
```

`buildLayeredImage` は path 単位の content-addressed layer なので、変わってない layer は cache から再利用される（差分 layer のみ作り直し）。

## 用途

| ツール | 由来 | 用途 |
|------|------|------|
| `nodejs` | nix (`nodejs_24`) | ランタイム |
| `pnpm` | nix | パッケージマネージャ・monorepo タスクランナー |
| `deno` | nix | 使い捨てワンショットスクリプト用（`node -e` の代替）。permission 制御で最小権限を明示。詳細は [.claude/rules/general.md](./general.md) |
| `gh` | nix | GitHub CLI（PR・issue、`/commit-and-pr` skill が利用） |
| `jq` | nix | JSON 整形（`aws logs` / `wrangler tail` のパイプ処理） |
| `aws` | nix (`awscli2`) | Collector ログ・Lambda 診断 |
| `claude` | pnpm (`@anthropic-ai/claude-code`) | Claude Code |
| `wrangler` | pnpm | Cloudflare Workers（API デプロイ・D1・tail） |
| `vercel` | pnpm | Vercel（Frontend ログ・デプロイ確認） |
| chromium | nix (`playwright-driver.browsers-chromium`) | Crawler の Playwright が呼び出す。`PLAYWRIGHT_BROWSERS_PATH` で image 内 path に固定済み |

## ログ取得 CLI 認証

3 基盤のログを CLI から取得するための認証前提（すべてサンドボックス内で実行）:

| 基盤 | CLI | 認証 |
|------|-----|------|
| Collector | `aws logs` | `AWS_PROFILE=crawler-debug`（profile 定義はホストの `~/.aws/{config,credentials}` を `~/.sho-sandbox/aws/` にスナップショット。AssumeRole / SSO の cache はコンテナ内 `~/.sho-sandbox/aws/` に閉じる） |
| API (Workers) | `wrangler tail job-store` | サンドボックス内で `wrangler login`（`~/.sho-sandbox/wrangler/` に永続化） |
| Frontend (Vercel) | `vercel logs` | サンドボックス内で `vercel login` + `vercel link`（`apps/frontend/hello-work-job-searcher` で実行、`.vercel/` はリポジトリ内に書かれる） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。
