# Frontend (apps/frontend/hello-work-job-searcher)

Next.js 16 + React 19。

## ページ

| パス | 概要 |
|------|------|
| `/jobs` | 求人一覧（検索フィルター + ページネーション + カードリスト） |
| `/jobs/[jobNumber]` | 求人詳細 |
| `/favorites` | お気に入り（localStorage 永続化） |

## 設計

- **RSC**: サーバーから直接 Hono RPC クライアントで API 呼び出し
- **subpath imports**: `#lib/backend-client` で Storybook 用モック差し替え
- **状態管理**: Jotai（お気に入り + localStorage 永続化）
- **スタイリング**: CSS Modules + CSS Custom Properties

## Storybook

- RSC テスト: `parameters.react.rsc: true` + subpath imports
- Vitest 統合: `vitest.config.ts` + `@storybook/addon-vitest`
- モックデータ: `src/lib/backend-client.mock.ts`（`InferResponseType` で型安全）

## コマンド

```bash
pnpm dev               # Dev server (port 9002)
pnpm build             # Build
pnpm storybook         # Storybook dev server (port 6006)
pnpm build-storybook   # Storybook ビルド
```
