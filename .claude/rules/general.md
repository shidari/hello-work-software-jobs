# General

プロジェクト全体に適用されるルール。

## 実行環境の判定 (host vs sandbox)

Claude が今 host (macOS) で動いてるか sandbox コンテナ (sho-sandbox, Linux) の中で動いてるかは、利用可能な CLI / ファイルシステム / network 経路が大きく違う。session 冒頭で `.claude/hooks/announce-env.sh` (SessionStart hook) が宣言するので、まずそれを見る。

宣言が無い or 疑念が湧いた時は手動で `uname -s` を叩く:

| 出力 | 環境 |
|------|------|
| `Darwin` | host (macOS) — Apple container CLI で sandbox/ops を管理 |
| `Linux` + `/work` あり | sandbox (sho-sandbox) — Claude Code 本体と汎用 dev tools のみ。gh / wrangler / vercel は **PATH に無い**（host 専用） |
| `Linux` + `/work` なし | sandbox 以外の Linux (普段は来ない) |

判定は **kernel と bind mount で行う**。`SHO_SANDBOX` 等の env 変数は spoof / 取り違えが起こる (image rebuild 忘れで unset のまま、shell から手動 export で誤認 etc.) ので self-detect には使わない。

## CLI ツール

CLI の住み分け（sandbox 内 / host 専用）と実行方法は [.claude/rules/cli.md](./cli.md) を参照。`gh` / `wrangler` / `vercel` / `awscli` 等の認証付き CLI は host 専用。

## 作業単位 = worktree

**1 機能 = 1 worktree**。新しい機能追加・バグ修正・リファクタなど「ブランチを切るに値する作業」を始める時は、メイン作業ツリーで直接編集せず `EnterWorktree` で新しい worktree に入ってから着手する。

理由: 並行作業の差分が混ざると `git status` が複数文脈の混合になり、コミット粒度ルール（1 セッション = 1 コミット）も守れなくなる。worktree を分ければブランチ単位でコンテキストが物理的に隔離され、CI が走っている間に別作業に着手するのも安全になる。

例外: typo 修正・コメント追記・ドキュメントの 1 行直しなど「コミット 1 個で完結し、即マージ前提の trivial な変更」は worktree なしでメインから直接でよい。判断に迷ったら worktree を切る側に倒す。

実装: 着手前に `EnterWorktree` を使い、終わったら `ExitWorktree` で戻る。worktree の中では通常通り編集・コミット・PR 作成を行う。

強制: `.claude/hooks/enforce-worktree.sh`（PreToolUse hook）が main worktree 上での `Edit` / `Write` / `NotebookEdit` を block する。例外（trivial 修正）に該当する場合は、ユーザーに確認を取った上で `touch /tmp/.claude-allow-main-edit` を実行してから編集を再試行する。センチネルは 1 回限りで次の編集時に自動消費される。

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
