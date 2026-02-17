# Pre-commit checks

コミット前に実行するチェックを行う。

## 実行内容

以下を順番に実行し、問題があれば修正する:

1. **Biome lint + format** - staged ファイルのみに対して `pnpm exec biome check --write <files>` を実行
2. **Type check** - 変更があったパッケージのみ `pnpm exec tsc --noEmit` で型チェック

## 注意事項

- 修正が発生した場合は、修正内容を報告する
- 全てのチェックが通ったら「OK」とだけ報告する
