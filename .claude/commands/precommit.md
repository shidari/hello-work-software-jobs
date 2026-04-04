# Pre-commit checks

コミット前に実行するチェックを行う。

## 実行内容

以下を順番に実行し、問題があれば修正する:

1. **Biome lint + format** - staged ファイルのみに対して `pnpm exec biome check --write <files>` を実行（プロジェクト全体への実行は禁止。必ず staged ファイルだけを指定する）
2. **Type check** - 変更があったパッケージのみ `pnpm exec tsc --noEmit` で型チェック
3. **ドキュメント更新（必須・スキップ禁止）** — コミット前に必ず以下を実行する:
   1. `CLAUDE.md` を Read し、staged 変更と照合して **Common Commands** を更新する
   2. `ARCHITECTURE.md` を Read し、staged 変更と照合して更新する（ディレクトリ構成、Tech Stack、API Endpoints、DB、コンポーネント設計）
   3. `docs/references/conventions.md` を Read し、staged 変更と照合して更新する（Coding Conventions、Environment Variables、CI/CD）
   4. ルートの `README.md` を Read し、同様に更新する
   5. 変更パッケージの `README.md` があれば Read し、同様に更新する
   6. 更新したファイルは staging に追加する
   7. 結果を報告する:「CLAUDE.md: 更新なし / 更新あり（内容）」「ARCHITECTURE.md: 更新なし / 更新あり（内容）」「conventions.md: 更新なし / 更新あり（内容）」「README.md: 更新なし / 更新あり（内容）」

## 注意事項

- 修正が発生した場合は、修正内容を報告する
- 全てのチェックが通り、ドキュメント更新も不要なら「OK」とだけ報告する
