# アーキテクチャ

## データフロー

```
Cron Trigger (平日 01:00)
  → 求人番号抽出 Worker (@cloudflare/playwright)
  → Cloudflare Queue
  → 求人詳細 ETL Worker (@cloudflare/playwright + linkedom)
  → POST /jobs
  → API (Cloudflare Workers + D1)
  → GET /jobs
  → フロントエンド (Next.js 16)
```

---

## `packages/models`

ドメインモデル定義。全レイヤーから参照。

```typescript
// branded types
JobNumber, ReceivedDate, ExpiryDate, EmploymentType,
Wage, WorkingTime, EmployeeCount, HomePageUrl

// 構造体
WageRange    = { min: Wage, max: Wage }
WorkingHours = { start: NullOr(WorkingTime), end: NullOr(WorkingTime) }

Job = {
  jobNumber, companyName, receivedDate, expiryDate, homePage,
  occupation, employmentType, wage, workingHours,
  employeeCount, workPlace, jobDescription, qualifications,
}
```

## `packages/db`

Kysely 型定義 + DB行スキーマ。D1 (SQLite) 向け。

- `schema.sql` が DDL の Source of Truth
- `kysely-codegen` で `src/generated/types.ts` を自動生成（`pnpm codegen`）
- `src/schema.ts` に `DbJobRowSchema`（フラットDB行スキーマ）を定義。型レベルチェックで Kysely 生成型との整合性を保証
- ドメインモデルへの変換（`DbJobSchema`）は `api/src/cqrs/index.ts` で行う
- `src/queries.ts` に集計クエリユーティリティ（`selectDailyStats` 等）を提供。API 層から `sql` を直接 import しない設計

---

## `apps/backend/api`

Cloudflare Workers + Hono。

### エンドポイント

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| GET | `/jobs` | - | 一覧取得（フィルター + ページネーション） |
| POST | `/jobs` | x-api-key | 登録 |
| GET | `/jobs/:jobNumber` | - | 個別取得 |
| GET | `/stats/daily` | - | 日ごとの新着求人数サマリー |

### 設計

- **CQRS**: 各操作が独立した `Effect.Service`。コマンド（`InsertJobCommand`）とクエリ（`FindJobByNumberQuery`, `FetchJobsPageQuery`, `FetchDailyStatsQuery`）に分離。
- **エラー**: `Data.TaggedError` で型安全なエラーハンドリング。コントローラーで `Effect.match` により分岐。
- **ページネーション**: ページ番号方式。

---

## `apps/backend/collector`

Cloudflare Workers + Browser Rendering + Queues + Effect サービスパターン。

### パイプライン

1. **求人番号抽出** — Cron Trigger → Worker → @cloudflare/playwright で検索ページ走査 → Queue 送信
2. **求人詳細 ETL** — Queue → Worker → @cloudflare/playwright で HTML 取得 → linkedom でパース → API に POST

### インフラ (wrangler.jsonc)

- Worker (scheduled + queue handler)
- Browser Rendering binding
- Cloudflare Queues (job-detail-queue + DLQ)

---

## `tools/hwctl`

Haskell (Stack) 製の admin CLI。AI エージェントフレンドリー設計（JSON デフォルト出力）。

### コマンド

| コマンド | 概要 |
|---------|------|
| `hwctl jobs list [--page N] [--keyword TEXT] [--table]` | 求人一覧取得 |
| `hwctl jobs get <jobNumber> [--table]` | 個別求人取得 |
| `hwctl stats daily [FILTER_JSON] [--table]` | 日ごとの新着求人数サマリー |

### 設計

- **デフォルト JSON 出力**: `--table` で human-readable テーブル表示に切替
- **構造化エラー**: `{ "error": { "code": "...", "message": "..." } }` を stderr に出力
- **終了コード**: 0=成功, 1=エラー
- **設定**: 環境変数 `HWCTL_ENDPOINT` (デフォルト: `http://localhost:8787`), `HWCTL_API_KEY`

---

## `apps/frontend/hello-work-job-searcher`

Next.js 16 + React 19。

### ページ

| パス | 概要 |
|------|------|
| `/jobs` | サイドバー（検索バー + 求人一覧）+ メイン（求人詳細パネル） |
| `/favorites` | お気に入り（localStorage 永続化） |
| `/history` | 検索履歴 |

### 主な機能

- @tanstack/react-virtual による仮想スクロール
- JWT ページネーション
- 8種フィルター検索
- スクロール位置復元
