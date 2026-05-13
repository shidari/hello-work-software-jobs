---
name: codex-review-loop
description: commit 前に codex review を最大 3 周ループで回す。各周で codex の指摘を別 claude プロセスが読み、納得した部分だけ修正 → 再レビュー。終了後、Claude (本セッション) がユーザーに最終結果を報告する。TRIGGER when: ユーザーが「コミット」「PR 作成」「push」を依頼し、未コミット差分にコード変更（`.ts` / `.tsx` / `.js` / `.jsx` / `.css` / `.sh` / `.py` 等）が含まれる時、`/commit-and-pr` の Step 0 として自動実行する。SKIP when: 変更がドキュメント (`.md`) / 設定 (`.json` / `.toml` / `.yml`) のみ、または 1 行未満の trivial 修正、またはユーザーが明示的にスキップを指示した時。
---

# Codex Review Loop

commit 前に **codex (別 LLM)** にセカンドオピニオンをもらってから commit するためのスキル。Claude 単独の盲点を別モデルで埋めるのが目的。

3 周ループおよび各周の修正適用は [loop.sh](./loop.sh) が行う。本セッションの Claude は **script を起動 → 出力を読む → 最終結果をユーザーに報告** する役割。

## 前提

- **sandbox 内での実行必須**。子 claude が `--dangerously-skip-permissions` で動くため、host 直接実行はファイルシステム / ネットワークに無制限アクセスを与えることになり危険。`loop.sh` 冒頭で `SHO_SANDBOX=1` を確認し、無ければ exit 1 する（[scripts/assert-in-sandbox.sh](../../../scripts/assert-in-sandbox.sh) と同じ規約）
- `codex` / `claude` CLI がサンドボックス内で利用可能（[.claude/rules/cli.md](../../rules/cli.md) 参照）
- 未コミット差分（staged + unstaged + untracked）が存在する。なければ script が即終了する
- このスキルは **commit はしない**。レビュー → 修正までで止める。commit は別途 `/commit-and-pr` を呼ぶ

## 手順

### 1. ループ実行

```bash
./.claude/skills/codex-review-loop/loop.sh        # デフォルト 3 周
./.claude/skills/codex-review-loop/loop.sh 2      # 位置引数で 1〜3 の範囲で指定可
MAX_ROUNDS=2 ./.claude/skills/codex-review-loop/loop.sh  # 環境変数でも可
```

**MAX_ROUNDS は 3 周を hard cap とする**。codex / claude を多数回走らせて API 課金・実行時間・想定外の編集量が暴走するのを避けるため、位置引数 / env で 4 以上を渡すと `loop.sh` が exit 1 で弾く。緩めたい時は `loop.sh` 内の `MAX_ROUNDS_HARD_CAP` を直接書き換える運用にする。

周回数の決定は Claude (本セッション) に任されている。差分のサイズ・複雑度を見て:

- 小さい差分 (1〜2 ファイル、ロジック変更なし) → 1〜2 周
- 中〜大規模 (複数ファイル / ロジックあり / リファクタ・新機能) → 3 周（デフォルト & 上限）

`codex` / `claude` CLI が無い環境では graceful skip（exit 0）するので、`/commit-and-pr` の Step 0 として呼んでも commit フローは止まらない。

script の中身:

1. `codex review --uncommitted` で指摘を出す
2. 指摘を `claude -p --dangerously-skip-permissions` に流し、別 claude プロセスが triage + 修正
3. 差分が増えなければ早期終了、そうでなければ次周へ。最大 `MAX_ROUNDS` 周（デフォルト 3、hard cap 3）

### 2. 最終結果の報告（本セッションの Claude が実施）

script が完了したら、本セッションの Claude が出力を読んで以下をユーザーに報告する:

- **実行した周回数**（早期終了したならその周まで）
- **各周の codex 指摘件数と accept / reject 件数**（script 出力から拾う）
- **修正されたファイル一覧**（`git status --short` の結果から）
- **代表的な accept 内容**（バグ修正・型修正など重要なもの 2〜3 件）
- **代表的な reject 内容**（なぜ却下したか 1〜2 件）
- **次のアクション提案**（commit してよさそうなら `/commit-and-pr` を案内、追加で人間レビュー欲しい点があれば指摘）

報告フォーマット例:

```
codex review loop 完了 (N 周実行)

修正されたファイル:
- apps/backend/api/src/foo.ts: null チェック追加
- packages/models/src/bar.ts: Schema.brand の漏れ修正

主な accept:
- foo.ts:42 で undefined アクセスの可能性 → optional chaining に修正

主な reject:
- bar.ts のコメント追加提案 → CLAUDE.md のコメント方針 (WHY のみ) と整合しないため見送り

次のアクション: 差分は良好なので /commit-and-pr で進められます。
```

## 注意事項

- **commit はしない**。レビュー → 修正までで終了
- script 内の `claude -p` は `--dangerously-skip-permissions` で動くため、host で実行するとファイルシステム / ネットワークに無制限アクセスを与える。`loop.sh` 冒頭で `SHO_SANDBOX=1` を強制チェックして host 起動を弾いている
- codex / claude の login 切れに注意。失敗時は script が WARN を出して次周へ進む。3 周全滅ならその旨を最終報告に含める
- script は再帰的に claude を起動する（本セッション → loop.sh → claude -p）。子セッションの編集は親 (本セッション) からも見えるので、最終報告では親セッションが `git diff HEAD` を読んで内容を把握できる
