# CLI ツール

開発用 CLI のうち **認証 token を抱える**もの (`gh` / `wrangler` / `vercel` / `awscli`) は dev サンドボックスには入れない。ブラスト半径を最小化するため、これらはすべて **ホスト (macOS) 側で直接実行する**。sandbox は Claude Code 本体と汎用 dev tools (`nodejs` / `pnpm` / `deno` / `jq` / chromium) だけを抱える Apple container ベースの最小実行環境 (`sho-sandbox`) で、OCI image は **nix の `dockerTools.buildLayeredImage`** で組み立てる（[flake.nix](../../flake.nix) / [scripts/sandbox.sh](../../scripts/sandbox.sh)）。

| CLI | どこで動かすか | 認証の置き場所 |
|-----|---------------|-----------|
| `gh` | **host のみ** | `~/.config/gh/` (host) |
| `wrangler` | **host のみ** (workspace devDep として `apps/backend/api` には残る) | `~/.config/.wrangler/` (host) |
| `vercel` | **host のみ** | `~/.config/com.vercel.cli/`, `~/.local/share/com.vercel.cli/` (host) |
| `awscli` | **入れない**。ops container 経由の MCP のみ | — |
| `claude` | sandbox / host どちらでも | sandbox: `~/.sho-sandbox/claude/` / host: `~/.claude/` |
| `nodejs` / `pnpm` / `deno` / `jq` / chromium | sandbox / host どちらでも | 認証なし |

Claude Code 自体が sandbox 内で動いている場合、`gh` / `wrangler` / `vercel` は **PATH に無い**。これらが必要な操作 (PR の作成・マージ、Workers / Pages デプロイ等) は:
1. ホスト側で叩いてもらうようユーザーに依頼する、または
2. Claude Code がホストで動き直してから実行する

の二択。GitHub / AWS の参照は ops サンドボックス (`sho-mcp-ops`) 側に閉じた MCP server (`ops-github` / `ops-aws-cloudwatch` / `ops-aws-api`) 経由で行う。`ops-github` は PAT scope に従い write 系 tool (PR 作成 / Issue 作成 / コメント等) も使える。`ops-aws-cloudwatch` / `ops-aws-api` は read-only。詳細は後段の「MCP ops コンテナ」節を参照。

Claude Code がホスト (macOS) 側で動いている場合は、ホストの `gh` / `wrangler` / `vercel` / `jq` を `./scripts/sandbox.sh` を経由せずに直接呼ぶ。判定は `uname` が `Darwin` ならホスト、`Linux` かつ `/work` symlink があればコンテナ内。

## 構成

| 層 | 何をするか |
|------|-----------|
| `flake.nix` | aarch64-linux 用の OCI image 定義。chromium / nodejs / pnpm / deno / jq / openssh / cacert 等を contents に列挙（gh / wrangler / vercel / awscli は意図的に除外） |
| `package.json` (root devDependencies) | `@anthropic-ai/claude-code` のみ npm 配布物として pnpm 管理。container 内で `pnpm install` すると `/work/node_modules/.bin/claude` に展開され、image の PATH に組み込まれる |
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

初回は `sandbox.sh` で中に入った後 `pnpm install` を 1 度叩く（root devDeps の `@anthropic-ai/claude-code` を `/work/node_modules/.bin/claude` に展開）。その後 sandbox 内では `claude /login` だけ実行する。`gh` / `wrangler` / `vercel` は host 側で `brew install` 等して `gh auth login` / `wrangler login` / `vercel login` をブラウザ OAuth で済ませる。

## 認証情報の扱い

**dev サンドボックスは認証 token を一切持たない**。`gh` / `wrangler` / `vercel` / `awscli` は image にも入っていないし、host から bind-mount もしない (`~/.sho-sandbox/{gh,wrangler,vercel*}` は廃止済み)。これらが必要な操作は host 側で実行する。

sandbox がまだ保持するのは Claude Code 自身と VSCode-server の状態のみ:

| ツール | ホスト側 | コンテナ内 |
|--------|---------|-----------|
| `claude` | `~/.sho-sandbox/claude/` | `/root/.claude/` |
| `vscode-server` | `~/.sho-sandbox/vscode-server/` | `/root/.vscode-server/` |

実 AWS への到達経路は dev サンドボックスからは外している。`awscli` は flake から削除済みで、`~/.aws` の mount も無い。CloudWatch / SQS / Lambda / EventBridge 等は **ops サンドボックス** (`sho-mcp-ops`) 側に閉じた MCP server（`ops-aws-cloudwatch` / `ops-aws-api`、いずれも read-only）経由で読む（後段「MCP ops コンテナ」節）。

## Claude project-level permissions の分離 (host vs container)

`.claude/settings.local.json` (project-level の allow list / additionalDirectories) は repo 内に居るので、素朴に bind mount すると host で許可したコマンドが container でも prompt 無しで通ってしまう。

これを分離するために以下の構造を取る:

```
<repo>/.claude/
├── settings.local.json          ← symlink → permissions/settings.local.json (相対)
├── permissions/
│   └── settings.local.json      ← 実ファイル
│       host: host が蓄積した allow list
│       container: dir-level bind mount (read-only) で上書きされ、
│                  ~/.sho-sandbox/claude-permissions/settings.local.json (空 {} 固定) が見える
├── hooks/ rules/ skills/         ← そのまま、影響なし
└── ...
```

### 何故 dir 単位の overlay か

Apple container CLI 0.11.0 の virtiofs は **file-level bind mount が機能しない** (stat は通るが `open(2)` が EACCES で落ちる)。なので「`.claude/settings.local.json` だけ container 内で別実体に差し替える」が直接は出来ない。代わりに実体をサブディレクトリに逃がして directory-level bind mount で覆う。

### 何処に allow が貯まるか

overlay は read-only mount なので、container 側で project-level に書こうとしても kernel が `EROFS` で蹴る。結果、Claude in container は user-level (`/root/.claude/settings.json` = `~/.sho-sandbox/claude/settings.json` 経由で永続化) に allow を貯める。

| 環境 | project-level (= settings.local.json 経由) | user-level | 蓄積先 |
|------|---|---|---|
| host | `<repo>/.claude/permissions/settings.local.json` (実ファイル、書込可) | `~/.claude/settings.json` (使わない) | **project-level** |
| container | overlay の空 {} (read-only、書込不可) | `/root/.claude/settings.json` (= `~/.sho-sandbox/claude/`) | **user-level** |

host で許可したものは host の project-level に貯まり、container からは空 overlay 越しに見えるので漏れない。container で許可したものは user-level (sandbox 内永続) に貯まり、host からは見えない。

### worktree

新規 `EnterWorktree` のたびに `.claude/hooks/link-worktree-settings.sh` が worktree の `.claude/settings.local.json` を **main の `<repo>/.claude/settings.local.json` への絶対 symlink** にする。main は更に `permissions/settings.local.json` への相対 symlink なので、解決チェーンは：

```
worktree settings.local.json
  → main settings.local.json (symlink)
    → permissions/settings.local.json (host: 実ファイル、container: overlay 経由空 {})
```

worktree 固有の状態は持たない。main を経由するのは sandbox.sh の migration が未実行な時 (`permissions/` がまだ無い時) でも valid な symlink を保つため。

既存 worktree (この仕組み導入前から在るもの) の `.claude/settings.local.json` は regular file のまま放置される (hook は regular file を破壊しない)。新規 worktree だけ症状改善する。

### Migration / 安全策

- 既存 container が overlay mount を持っていなかったら `sandbox.sh` は abort (exit 1) する。host の allow list が漏れ続けるのを silent に許さないため。`./scripts/sandbox-stop.sh && ./scripts/sandbox.sh` で recreate を要求する
- `<repo>/.claude/settings.local.json` (regular file) と `<repo>/.claude/permissions/settings.local.json` (file) が両方存在する ambiguous state も同様に abort し、`diff` で確認 → 不要な方を rm するよう促す

## image を更新したい時

```bash
# flake.nix を編集（package を追加 / 削る等）
./scripts/sandbox-image.sh   # build → smoke test → 旧 container 破棄 → 新 image で再作成 を 1 本で
```

`buildLayeredImage` は path 単位の content-addressed layer なので、変わってない layer は cache から再利用される（差分 layer のみ作り直し）。

## 用途

### sandbox 内 (sho-sandbox)

| ツール | 由来 | 用途 |
|------|------|------|
| `nodejs` | nix (`nodejs_24`) | ランタイム |
| `pnpm` | nix | パッケージマネージャ・monorepo タスクランナー |
| `deno` | nix | 使い捨てワンショットスクリプト用（`node -e` の代替）。permission 制御で最小権限を明示。詳細は [.claude/rules/general.md](./general.md) |
| `jq` | nix | JSON 整形 |
| `claude` | pnpm (`@anthropic-ai/claude-code`) | Claude Code |
| chromium | nix (`playwright-driver.browsers-chromium`) | Crawler の Playwright が呼び出す。`PLAYWRIGHT_BROWSERS_PATH` で image 内 path に固定済み |

### host のみ

| ツール | 配布物 | 用途 |
|------|------|------|
| `gh` | host (`brew install gh`) | GitHub CLI（PR・issue、`/commit-and-pr` skill が利用） |
| `wrangler` | host (`brew install cloudflare-wrangler2` or workspace pnpm) | Cloudflare Workers（API デプロイ・D1・tail） |
| `vercel` | host (`brew install vercel-cli`) | Vercel（Frontend ログ・デプロイ確認） |

実 AWS API への直接アクセスは dev サンドボックスからは出来ない（awscli 撤去）。代わりに ops サンドボックス側の MCP server を使う（後段「MCP ops コンテナ」節）。LocalStack は docker compose の localstack service に同梱されている `awslocal` を `docker compose exec` 経由で叩く（[apps/backend/collector/infra/local/e2e.sh](../../apps/backend/collector/infra/local/e2e.sh) 参照）。

## ログ取得 CLI 認証

3 基盤のログ取得の前提:

| 基盤 | 経路 | 認証 |
|------|-----|------|
| Collector | `ops-aws-cloudwatch` MCP（`execute_log_insights_query` 等） | host の `~/.aws/{config,credentials,sso/cache}` を ops コンテナが起動時に `~/.sho-mcp-ops/aws/` にスナップショットして mount。`AWS_PROFILE=crawler-debug` は ops 側 env で固定。SSO profile を使う場合は `aws sso login` 後に ops を再起動して cache を取り直す |
| API (Workers) | host の `wrangler tail job-store` | host で `wrangler login`（`~/.config/.wrangler/` に永続化） |
| Frontend (Vercel) | host の `vercel logs` | host で `vercel login` + `vercel link`（`apps/frontend/hello-work-job-searcher` で実行、`.vercel/` はリポジトリ内に書かれる） |

認証が切れている場合は `/debug` skill が検知して再ログインを促す。Collector 系で MCP が認証エラーを返すなら、host で `aws sso login --profile crawler-debug` を打ってから `./scripts/ops-sandbox.sh --stop && ./scripts/ops-sandbox.sh` で snapshot を取り直す。

## MCP ops コンテナ (sho-mcp-ops)

dev sandbox とは別に、GitHub / AWS の MCP server を expose するための **ops コンテナ**を `sho-mcp-net` という private network 上で動かす。Claude (dev sandbox = `sho-sandbox`) は同 network から SSE でアクセスする。token / AWS credentials は ops コンテナだけが持ち、dev sandbox からは直接見えない。

| 層 | 何をするか |
|------|-----------|
| `packages/mcp-ops/flake.nix` | aarch64-linux 用の OCI image 定義。bash / curl / python3 / uv / nginx / tini / libstdc++ 等 minimal セット |
| `packages/mcp-ops/start.sh` | image の Cmd。`github-mcp-server` (Go、toolset を pull_requests/issues/actions/repos に絞った上で write も許可) と `awslabs.cloudwatch-mcp-server` / `awslabs.aws-api-mcp-server` (Python via uvx、いずれも read-only) を `mcp-proxy` で stdio→SSE 化し、127.0.0.1:7011/7012/7013 で internal listen。その手前に nginx を立てて 7001/7002/7003 で外向きに expose する |
| `packages/mcp-ops/nginx.conf` | nginx 設定。Claude (dev sandbox) → mcp-proxy の手前で `limit_req` ベースの簡易レート制限を掛ける。gh は 30 r/min (burst 10)、aws / aws-api は 60 r/min (burst 20)。閾値超過時は 429。SSE 用に `proxy_buffering off` + 長い `proxy_read_timeout` |
| `scripts/ops-sandbox-image.sh` | nix build → OCI archive → `container image load` → smoke test → ops container 再作成 まで 1 本 |
| `scripts/ops-sandbox.sh` | ops コンテナの起動 / 停止 / ログ。起動時に macOS Keychain から PAT を取り出し、bind mount 用の一時 file に書き出す。`~/.aws/{config,credentials,sso/cache}` も `~/.sho-mcp-ops/aws/` に snapshot して mount する（SSO 利用時は token cache が必須） |
| `.mcp.json` | project レベル MCP 設定。`sho-mcp-net` 上の hostname `sho-mcp-ops` の SSE endpoint を `ops-github` / `ops-aws-cloudwatch` / `ops-aws-api` として登録 |

ops コンテナが expose する MCP server:

| port | server | 役割 | 認可 |
|------|--------|------|------|
| 7001 | `github-mcp-server` | GitHub の issue / PR / actions / repos を参照・操作（write 含む） | PAT scope で write 範囲を制限。toolset は `pull_requests,issues,actions,repos` のみ有効 |
| 7002 | `awslabs.cloudwatch-mcp-server` | CloudWatch Logs / Metrics の問い合わせ | `AWS_PROFILE=crawler-debug` |
| 7003 | `awslabs.aws-api-mcp-server` | 汎用 AWS API（SQS / Lambda / EventBridge 等）。dev sandbox から awscli を撤去した代わり | `AWS_PROFILE=crawler-debug` + `READ_OPERATIONS_ONLY=true` で書き込み拒否 |

### GitHub PAT の保存（macOS Keychain）

fine-grained PAT (`Contents:Read` / `Pull requests:RW` / `Issues:RW` / `Actions:R`) を発行して Keychain に保存する。`Contents` は read のみで、branch push / squash merge 等は host の `gh` CLI 側で行う方針:

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
