# General

プロジェクト全体に適用されるルール。

## 実行環境の判定 (host / sandbox / web)

Claude が今 host (macOS) / sandbox コンテナ (sho-sandbox, Linux) / Claude Code on the web (Anthropic-managed cloud container, Linux) のどこで動いてるかは、利用可能な CLI / ファイルシステム / network 経路が大きく違う。session 冒頭で `.claude/hooks/announce-env.sh` (SessionStart hook) が宣言するので、まずそれを見る。

宣言が無い or 疑念が湧いた時は手動で `uname -s` を叩く:

| 出力 | 環境 |
|------|------|
| `Darwin` | host (macOS) — Apple container CLI で sandbox/ops を管理 |
| `Linux` + `/work` symlink あり | sandbox (sho-sandbox) — Claude Code 本体と汎用 dev tools のみ。gh / wrangler / vercel は **PATH に無い**（host 専用） |
| `Linux` + `/home/user` あり | web (Claude Code on the web) — Anthropic-managed ephemeral cloud container。gh / wrangler / vercel / awscli は **不在**。GitHub 操作は `mcp__github__*` MCP tools 経由 |
| `Linux` + 上記いずれもなし | sandbox 以外の Linux (普段は来ない) |

判定は **kernel と filesystem signals で行う**。`SHO_SANDBOX` 等の env 変数は spoof / 取り違えが起こる (image rebuild 忘れで unset のまま、shell から手動 export で誤認 etc.) ので self-detect には使わない。

## CLI ツール

CLI の住み分け（sandbox 内 / host 専用）と実行方法は [.claude/rules/cli.md](./cli.md) を参照。`gh` / `wrangler` / `vercel` / `awscli` 等の認証付き CLI は host 専用。

Claude Code on the web ではこれらの CLI も入っていない。GitHub 操作 (PR・issue・コメント・file 読み書き等) は `mcp__github__*` MCP tools 経由で行い、wrangler / vercel が必要なオペレーション (deploy・tail) は host 側のユーザーに依頼する。

## 作業単位 = worktree

**1 機能 = 1 worktree**。新しい機能追加・バグ修正・リファクタなど「ブランチを切るに値する作業」を始める時は、メイン作業ツリーで直接編集せず `EnterWorktree` で新しい worktree に入ってから着手する。

理由: 並行作業の差分が混ざると `git status` が複数文脈の混合になり、コミット粒度ルール（1 セッション = 1 コミット）も守れなくなる。worktree を分ければブランチ単位でコンテキストが物理的に隔離され、CI が走っている間に別作業に着手するのも安全になる。

例外: typo 修正・コメント追記・ドキュメントの 1 行直しなど「コミット 1 個で完結し、即マージ前提の trivial な変更」は worktree なしでメインから直接でよい。判断に迷ったら worktree を切る側に倒す。

実装: 着手前に `EnterWorktree` を使い、終わったら `ExitWorktree` で戻る。worktree の中では通常通り編集・コミット・PR 作成を行う。

強制: `.claude/hooks/enforce-worktree.sh`（PreToolUse hook）が main worktree 上での `Edit` / `Write` / `NotebookEdit` を block する。例外（trivial 修正）に該当する場合は、ユーザーに確認を取った上で `touch /tmp/.claude-allow-main-edit` を実行してから編集を再試行する。センチネルは 1 回限りで次の編集時に自動消費される。

Claude Code on the web では各 session が独立した cloud container で動いており、session = branch の isolation が container 境界で担保されているため、`enforce-worktree.sh` は web では skip される（fresh clone なので `.git` が directory のまま → main worktree 扱いになるのを避けるため）。web 側では普通に branch を切って編集してよい。

## コミット粒度

**1 Claude セッション = 1 コミット**。ユーザーから「コミットして」と言われたら、そのセッション中に Claude が触った差分だけを stage する。セッション開始前から存在する未コミット差分（`git status` に出ている他の M / ?? ファイル）には触らない。

理由: セッション = 1 つの意図のまとまりで切り、`git log` をセッション履歴と一致させて追えるようにするため。並行で別作業中の差分を巻き込むと、後から責任範囲を切り分けられなくなる。

実装: `git add -A` / `git add .` は禁止。Claude が編集 / 作成したファイルだけを名指しで `git add <path>` する。複数セッションを跨いで触ったファイルがある場合のみ、ユーザーに確認する。

## CI / 長時間ジョブの待機

**`sleep` ループで polling しない**。GitHub Actions / PR checks / wrangler deploy など「完了を待ちたい」ケースは、専用の watch サブコマンドを `run_in_background: true` で投げて完了通知を受ける。

| 待ちたい対象 | コマンド |
|-------------|---------|
| PR の全チェック | `gh pr checks <pr> --watch --fail-fast` |
| 特定の workflow run | `gh run watch <run-id> --exit-status` |
| 直近の run（自分の PR） | `gh run watch $(gh run list --branch $(git branch --show-current) --limit 1 --json databaseId -q '.[0].databaseId') --exit-status` |

理由: `sleep` ループは cache を温め直す無駄打ちが増え、終了タイミングも粗くなる。watch 系は完了まで block して exit code を返すので、`run_in_background` と組み合わせれば「投げっぱなしで通知を待つ」が成立する。

判断: `--exit-status` / `--fail-fast` を付けて失敗時に non-zero で落とす。プロセスが終わったら通知が飛んでくるので、こちらから `sleep` で polling しない。

## ロギング

- 構造化ログのキー名規約は [docs/LOGGING.md](../../docs/LOGGING.md) を参照
- 失敗ログには **必ず** `service` / `_tag` / `jobNumber`（該当時）を含める
- 横断デバッグは `/debug` skill を使う

## ワンショットスクリプト実行

調査・検証用の使い捨てワンライナー / 短いスクリプトは `node -e` ではなく **deno** を使う。

| サブコマンド | 権限 | 用途 |
|------|------|------|
| `deno eval '<code>'` | **暗黙の all permissions** (flag 不可) | inline 1 発書き捨て。JSON 整形・ファイル走査・集計など |
| `deno run --allow-X=<scope> <file>` | flag で明示的に最小権限 | 何度か走らせるスクリプト / 信用境界を引きたい時 |

`deno eval` は v2 以降 `--allow-*` flag を **受け付けない** (`unexpected argument '--allow-read' found` で落ちる)。eval は trusted な書き捨て専用と割り切る。最小権限を引きたい時は `deno run` を一時 file 経由で叩く:

```bash
cat > /tmp/foo.ts <<'TS'
const txt = Deno.readTextFileSync("/tmp/data.json");
console.log(JSON.parse(txt));
TS
deno run --allow-read=/tmp /tmp/foo.ts
```

**Read / Edit / Write tool で済む場合は deno を呼ばない**。単一ファイルの読み書きや JSON の中身を見るだけなら専用 tool の方が安全で速い。deno は「ロジック付きの処理（複数ファイル走査・集計・変換）」が必要になったときだけ。

**棲み分け**: Deno はあくまで「リポジトリのコードに繋がらない単発スクリプト」専用。リポジトリ内パッケージ（`@sho/*`）を import する検証や `apps/`・`packages/` 配下に永続的に置くスクリプトは、pnpm workspace 解決のため `tsx scripts/foo.ts` を使う。

## codex CLI (セカンドオピニオン)

別 LLM のコードレビューを得るために `codex` CLI を使う。host / sandbox どちらでも利用可。詳細な周回・auto-apply は `/codex-review-loop` skill が wrap している。

| 目的 | コマンド |
|------|---------|
| 未コミット差分 (staged + unstaged + untracked) をレビュー | `codex review --uncommitted` |
| 既存 commit をレビュー | `codex review --commit <SHA>` |
| base ブランチとの diff をレビュー | `codex review --base main` |
| 補助 prompt 付き | `codex review --uncommitted "X 周りの抜けを重点的に"` |

`codex review` は非対話で完走して finding を stdout に出す。`[P0]` / `[P1]` / `[P2]` 等の severity tag が付くので、accept / reject を判断する。出力末尾の thread エラー (`failed to record rollout items`) は session telemetry の都合で無視してよい。

`/codex-review-loop` skill は上記を `claude -p --dangerously-skip-permissions` と組み合わせて最大 3 周 auto-apply する。**個別 finding を読みつつ自分で修正したい時は素の `codex review --uncommitted` を直接叩く**。loop と違い `SHO_SANDBOX=1` チェックは無いので host からでも回せる。
