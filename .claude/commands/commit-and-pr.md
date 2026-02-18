# Commit and PR

コミットからPR作成までを一貫して実行する。

## 手順

### 1. Pre-commit チェック

以下を順番に実行し、問題があれば修正する:

1. `pnpm exec biome check --write <staged files>` (staged ファイルのみ lint + format。プロジェクト全体への実行は禁止)
2. 変更があったパッケージのみ `pnpm exec tsc --noEmit` で型チェック
3. ドキュメント更新（必須・スキップ禁止） — コミット前に必ず以下を実行する:
   1. `CLAUDE.md` を Read ツールで読み込み、staged 変更と照合して以下を更新する:
      - **Architecture** 図（ディレクトリ構成の追加・削除）
      - **Tech Stack** テーブル（ライブラリ・フレームワークの追加・削除・変更）
      - **Common Commands**（コマンドの追加・変更）
      - **Coding Conventions**（規約・ツール・パターンの変更）
      - **API Endpoints**（エンドポイントの追加・削除・変更）
   2. ルートの `README.md` を Read し、同様に更新する
   3. 変更パッケージの `README.md` があれば Read し、同様に更新する
   4. 更新したファイルは staging に追加する
   5. 結果を報告する:「CLAUDE.md: 更新なし / 更新あり（内容）」「README.md: 更新なし / 更新あり（内容）」

### 2. コミット

- Conventional Commits 形式（日本語）
- スコープ付き（例: `feat(api): 求人検索フィルターを追加`）
- body に変更の説明を含める
- `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` を末尾に付ける

### 3. ブランチ作成 & Push

- main ブランチ上なら、コミット内容に基づいたブランチ名を作成する
  - 例: `feat/add-search-filter`, `refactor/models-domain-only`, `fix/companyname-type`
  - `git checkout -b <branch>` でブランチ作成（コミットは自動的に含まれる）
- 既に feature ブランチ上ならそのまま
- `git push -u origin <branch>` で push

### 4. PR 作成

- そのブランチの PR が未作成なら `devbox run gh pr create` で作成
  - タイトル: コミットメッセージの1行目
  - body: Summary（箇条書き）+ Test plan
  - body にバッククォート等の特殊文字を含む場合は `--body-file` を使う
- 既に PR があるなら push のみ（PR は自動更新される）

### 5. 結果報告

- PR の URL を表示する
- PR が既存の場合はその旨を伝える

## 引数

`$ARGUMENTS` が指定された場合、コミットメッセージのヒントとして使う。

## 注意事項

- 変更がない場合は何もしない
- secrets を含むファイル (.env, credentials.json 等) はコミットしない
- `devbox run gh` で GitHub CLI を実行する（`gh` 直接実行は不可）
