# Pre-commit checks

コミット前に実行するチェックを行う。

## 実行内容

以下を順番に実行し、問題があれば修正する:

1. **Biome lint + format** - staged ファイルのみに対して `pnpm exec biome check --write <files>` を実行
2. **Type check** - 変更があったパッケージのみ `pnpm exec tsc --noEmit` で型チェック
3. **ドキュメント更新** - 今回の変更に関連して CLAUDE.md や README.md の内容が古くなっていないか確認し、必要なら更新する
   - Architecture 図、Tech Stack、ファイルパス、コマンド例など
   - 更新した場合は staging に追加する

## 注意事項

- 修正が発生した場合は、修正内容を報告する
- 全てのチェックが通り、ドキュメント更新も不要なら「OK」とだけ報告する
