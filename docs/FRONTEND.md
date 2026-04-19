# フロントエンド設計

`apps/frontend/hello-work-job-searcher/` — Next.js 16 + React 19。

## ページ

| パス | 概要 |
|------|------|
| `/jobs` | 求人一覧（検索フィルター + ページネーション + カードリスト） |
| `/jobs/[jobNumber]` | 求人詳細（戻るボタン付き） |
| `/favorites` | お気に入り（localStorage 永続化） |

## 状態管理

- **求人データ**: RSC で API から取得。URL searchParams が Source of Truth（フィルター・ページネーション）
  - `/jobs` は Suspense + `use(jobsPromise)` でストリーミング（shell はヘッダ + フィルターフォーム、リストは `<JobsListSkeleton />` を fallback にしてロード）
  - 失敗時は `error.tsx` がキャッチ
- **お気に入り**: Jotai + localStorage（`atom.ts` に Source of Truth / Selectors / Writers を集約）

## UI コンポーネント (`src/components/ui/`)

CSS Modules + CSS Custom Properties によるスタイリング。各コンポーネントに `.stories.tsx` を同梱。

| コンポーネント | 概要 |
|--------------|------|
| Avatar | 画像 + フォールバック（sm/default/lg） |
| Badge | ラベル/タグ（default/secondary/outline） |
| Button | バリアント（primary/outline/ghost/danger）+ サイズ |
| Card, CardGroup | カードコンテナ |
| Collapsible | 展開/折りたたみ |
| Input | テキスト入力（invalid バリデーション状態対応） |
| Item, ItemContent, ItemTitle, ItemDescription, ItemMedia, ItemActions, ItemHeader, ItemFooter, ItemGroup, ItemSeparator | コンポジット リストアイテム |
| Label | `<dl>` ベースの key-value 表示 |
| Loading | スピナー |
| Navbar | ヘッダーナビゲーション |
| Pagination | ページ番号 + ellipsis ロジック内蔵（onPageChange コールバック） |
| Select | セレクトボックス |
| Skeleton | ローディングプレースホルダー |

### スタイリング方針

- **CSS Modules** (`.module.css`) でスコープ付きスタイル
- **CSS Custom Properties** (`--background`, `--accent`, `--muted` 等) でテーマトークン管理
- **data-variant / data-size 属性** でバリアント切り替え（クラス名連結ではなく）
- **data-slot 属性** でコンポーネント識別

## Storybook

- `.storybook/` に設定（`@storybook/nextjs-vite`）
- `pnpm storybook` でローカル起動（port 6006）
- アドオン: a11y, docs, vitest
- **RSC テスト**: `parameters.react.rsc: true` で RSC ページを Story 化。subpath imports（`#lib/backend-client`）で `backend-client.mock.ts` に差し替え
- **Vitest 統合**: `vitest.config.ts` + `@storybook/addon-vitest` で play 関数テストを `pnpm exec vitest --run` で実行
- **モックデータ**: `src/lib/backend-client.mock.ts` に Hono `InferResponseType` で型安全なモッククライアント + テストデータを集約

## 主な機能

- RSC ベースのデータ取得（`/api` プロキシ廃止、サーバーから直接 API 呼び出し）
- URL searchParams ベースのフィルター検索（検索ボタンで遷移）
- ページ番号ページネーション（onPageChange + useRouter による遷移）
- お気に入り（localStorage 永続化）
