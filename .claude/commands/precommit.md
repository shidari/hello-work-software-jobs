# Pre-commit checks

コミット前に実行するチェックを行う。

## 実行内容

以下を順番に実行し、問題があれば修正する:

1. **Biome lint + format** - ステージ済みファイルに対して `pnpm exec biome check --write` を実行
2. **Type check** - `pnpm -r exec tsc --noEmit` で型チェック
3. **copy-schema** - `pnpm --filter job-store-api run copy-schema` でスキーマをコピー（schema.ts に変更がある場合のみ）

## 注意事項

- 修正が発生した場合は、修正内容を報告する
- 全てのチェックが通ったら「OK」とだけ報告する
