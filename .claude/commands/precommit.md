# Pre-commit checks

コミット前に実行するチェックを行う。

## 実行内容

以下を順番に実行し、問題があれば修正する:

1. **Biome lint + format** - staged ファイルのみに対して `pnpm exec biome check --write <files>` を実行（プロジェクト全体への実行は禁止。必ず staged ファイルだけを指定する）
2. **Type check** - 変更があったパッケージのみ `pnpm exec tsc --noEmit` で型チェック
3. **ドキュメント更新（必須・スキップ禁止）** — コミット前に必ず以下を実行する:
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

## 注意事項

- 修正が発生した場合は、修正内容を報告する
- 全てのチェックが通り、ドキュメント更新も不要なら「OK」とだけ報告する
