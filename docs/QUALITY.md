# テスト・品質方針

## Property-Based Testing (PBT)

PBT は振る舞いを記述するためにも使う。PBT で書かれたテストはドキュメントである。

- スキーマや変換関数には PBT を優先して書く
- `effect/Arbitrary` + `effect/FastCheck` を使う（Effect コアに内蔵）
- `Arbitrary.make(schema)` で Schema から arbitrary を自動生成できる
- テスト名は「何が成り立つか」を日本語で明記する（例: `有効な賃金文字列 → min <= max`）

## Linting & Formatting

- **Biome** を使用（staged ファイルのみ対象。プロジェクト全体への実行は禁止）
- `pnpm exec biome check --write <files>` で lint + format
- import の並び順は Biome の `organizeImports` ルールに従う

## CI チェック

- `pr-checks.yml` で Build, Type check, Test, Lint を PR ごとに実行
- CDK synth (dry-run) でインフラ変更の検証

## Coverage

- 計測用テストは各パッケージの `__coveratge_tests__/` フォルダに隔離する（通常テストと混ぜない）
- 意図: カバレッジ数値を稼ぐためだけの低品質スイープテスト。振る舞いのドキュメント化には使わない
- 実行:
  - collector: `pnpm exec vitest run --coverage`（v8 provider）
  - api: `pnpm exec vitest run --coverage`（istanbul provider / vitest-pool-workers は `node:inspector` 非対応のため）
  - frontend: `pnpm exec vitest run --config vitest.coverage.config.ts --coverage`（storybook browser mode とは別 config）
- 生成物 (`coverage/`) は `.gitignore` 済み
