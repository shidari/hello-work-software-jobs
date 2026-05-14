---
name: commit-and-pr
description: コミットから PR 作成、CI/CD 監視、マージまでを一貫して実行する。pre-commit チェック、セキュリティレビュー、Conventional Commits、ブランチ作成、PR 作成、CI green 待ち、squash merge を自動化。
---

# Commit and PR

コミット → PR 作成 → CI/CD 監視 → squash merge までを一貫して実行する。

## 手順

### 0. codex review loop

未コミット差分にコード変更（`.ts` / `.tsx` / `.js` / `.jsx` / `.css` / `.sh` / `.py` 等）が含まれる場合、`/codex-review-loop` を実行して別 LLM のセカンドオピニオンを浴びる。

- ドキュメント (`.md`) / 設定 (`.json` / `.toml` / `.yml`) のみの変更ならスキップ
- 1 行未満の trivial 修正もスキップ可
- ユーザーが明示的に「codex 飛ばして」と言えばスキップ
- ループ完了後、修正内容を確認してから次の step に進む
- **重要**: ループ中の修正は working tree にしか入らない。事前に staging 済みのファイルがループで書き換わると、後続 step (biome / commit) は古い staged 版を見てしまう。`git status --short` で確認して、ループが触ったファイルを `git add <path>` で個別に再 staging する（`git add -A` は禁止）

### 1. Pre-commit チェック

以下を順番に実行し、問題があれば修正する:

1. `pnpm exec biome check --write <staged files>` で staged ファイルのみ lint + format（プロジェクト全体への実行は禁止）。**対象は biome が扱える拡張子のみ**: `.ts` / `.tsx` / `.js` / `.jsx` / `.mjs` / `.cjs` / `.css`（`.json` は biome.json で除外済み）。`.md` / `.sh` / `.yml` 等は biome 対象外なのでスキップ。staged にこれらの対象拡張子が 1 つもなければ biome 自体をスキップしてよい
2. 変更があったパッケージのみ `pnpm exec tsc --noEmit` で型チェック
3. ドキュメント更新（必須・スキップ禁止） — コミット前に必ず以下を実行する:
   1. `CLAUDE.md` を Read し、staged 変更と照合して **Common Commands** を更新する
   2. `ARCHITECTURE.md` を Read し、staged 変更と照合して更新する（ディレクトリ構成、Tech Stack、API Endpoints、DB、コンポーネント設計）
   3. `docs/references/conventions.md` を Read し、staged 変更と照合して更新する（Coding Conventions、Environment Variables、CI/CD）
   4. ルートの `README.md` を Read し、同様に更新する
   5. 変更パッケージの `README.md` があれば Read し、同様に更新する
   6. 更新したファイルは staging に追加する
   7. 結果を報告する:「CLAUDE.md: 更新なし / 更新あり（内容）」「ARCHITECTURE.md: 更新なし / 更新あり（内容）」「conventions.md: 更新なし / 更新あり（内容）」「README.md: 更新なし / 更新あり（内容）」

### 2. セキュリティレビュー

staging されたファイルに対して、security-review コマンドの Checklist に従いレビューを実施する:
- OWASP Top 10（Injection, Auth, Sensitive Data 等）
- Input Validation
- Data Protection
- **脆弱性導入チェック**: 変更されたコードに新たな脆弱性が導入されていないか確認する
  - コマンドインジェクション、XSS、SQLインジェクション等
  - 安全でないデシリアライゼーション
  - ハードコードされたシークレットや認証情報
  - 不適切な入力サニタイズ
- 問題が見つかった場合は修正してから次のステップに進む
- 問題がなければ「セキュリティレビュー: 問題なし」と報告する

### 3. コミット

- Conventional Commits 形式（日本語）
- スコープ付き（例: `feat(api): 求人検索フィルターを追加`）
- body に変更の説明を含める
- `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` を末尾に付ける

### 4. ブランチ作成 & Push

- main ブランチ上なら、コミット内容に基づいたブランチ名を作成する
  - 例: `feat/add-search-filter`, `refactor/models-domain-only`, `fix/companyname-type`
  - `git checkout -b <branch>` でブランチ作成（コミットは自動的に含まれる）
- 既に feature ブランチ上ならそのまま
- `git push -u origin <branch>` で push

### 5. PR 作成

- そのブランチの PR が未作成なら `gh pr create` で作成（host で動いている場合は host の `gh` を直接、sandbox の場合は `ops-github` MCP 経由）
  - タイトル: コミットメッセージの1行目
  - body: `docs/references/conventions.md` の PR テンプレートに従って作成する（Summary, Background & Motivation, Design Decisions, Changes, Test Plan）
  - body にバッククォート等の特殊文字を含む場合は `--body-file` を使う
- 既に PR があるなら push のみ（PR は自動更新される）

### 6. CI/CD 監視

push 後、PR の全 check が green になるまで監視する。

- `gh pr checks <pr> --watch --fail-fast` を **`run_in_background: true`** で投げて完了通知を待つ（[.claude/rules/general.md](../../rules/general.md) の方針に従う）。`sleep` ループでの polling は禁止
- PR 番号は `gh pr view --json number -q .number` で取得
- 通知が来たら exit code で判定:
  - **success (exit 0)** → Step 7 へ
  - **failure (non-zero)** → 失敗 job のログを取りに行く:
    1. `gh pr checks <pr> --json name,conclusion,link --jq '.[] | select(.conclusion=="FAILURE")'` で失敗 check を特定
    2. `gh run view <run-id> --log-failed` で失敗ジョブのログを取得（`gh pr checks` の link から run-id を抽出）
    3. 原因に応じて修正:
       - 型エラー / lint / format → 該当ファイルを直接修正
       - 単体テスト失敗 → 該当テストとプロダクションコードを読んで修正
       - 依存・環境起因（chromium のセットアップ失敗、network flake 等） → 一度だけ `gh run rerun <run-id> --failed` で再実行を試みる
    4. 修正したら **Step 1 (Pre-commit チェック)** に戻ってやり直す。コミットは新規作成（`--amend` 禁止）、push 後また Step 6 に来る
- 同じ check が 3 周以上連続で落ちたら hard stop。**自動修正ループを止めて、ユーザーに状況を報告し判断を仰ぐ**（誤修正リスクを避けるため）

### 7. マージ

全 check が green になったら squash merge する。

- `gh pr merge <pr> --squash --delete-branch` を実行
- マージ後にローカルの状態を整える:
  - `git checkout main && git pull` でローカル main を最新化
  - 削除済みのリモートブランチをローカルでも掃除（worktree 内なら `ExitWorktree` で抜けてから）

### 8. 結果報告

- PR の URL とマージ済み commit hash を表示する
- 監視 → マージまで自動でやった旨を伝える
- CI が失敗してリトライした場合はその回数と修正内容も併せて報告する

## 引数

`$ARGUMENTS` が指定された場合、コミットメッセージのヒントとして使う。

## 注意事項

- 変更がない場合は何もしない
- secrets を含むファイル (.env, credentials.json 等) はコミットしない
- `gh` はホスト (macOS) 側で直接実行する。sandbox には `gh` は入っていないので、sandbox-Claude は `ops-github` MCP 経由で同等の操作を行う（書き込み系は ops-github の `--read-only` を外す必要あり。今回のスコープ外）
