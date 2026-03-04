# アーキテクチャ

## データフロー

```
EventBridge (平日)
  → 求人番号抽出 Lambda (Playwright)
  → SQS キュー
  → 求人詳細 ETL Lambda (Playwright + linkedom)
  → POST /jobs
  → Job Store API (Cloudflare Workers + D1)
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
- ドメインモデルへの変換（`DbJobSchema`）は `job-store-api/src/cqrs/index.ts` で行う

---

## `apps/backend/job-store-api`

Cloudflare Workers + Hono。

### エンドポイント

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| GET | `/jobs` | - | 一覧取得（フィルター + ページネーション） |
| POST | `/jobs` | x-api-key | 登録 |
| GET | `/jobs/:jobNumber` | - | 個別取得 |

### 設計

- **CQRS**: 各操作が独立した `Effect.Service`。コマンド（`InsertJobCommand`）とクエリ（`FindJobByNumberQuery`, `FetchJobsPageQuery`）に分離。
- **エラー**: `Data.TaggedError` で型安全なエラーハンドリング。コントローラーで `Effect.match` により分岐。
- **ページネーション**: ページ番号方式。

---

## `apps/backend/headless-crawler`

AWS Lambda + Effect サービスパターン。

### パイプライン

1. **求人番号抽出** — EventBridge → Lambda (480s) → Playwright で検索ページ走査 → SQS 送信
2. **求人詳細 ETL** — SQS → Lambda (30s) → Playwright で HTML 取得 → linkedom でパース → API に POST

### インフラ (CDK)

- Lambda x2 + Playwright レイヤー
- SQS キュー

---

## `apps/frontend/hello-work-job-searcher`

Next.js 16 + React 19。

### ページ

| パス | 概要 |
|------|------|
| `/jobs` | 左: 検索バー + 求人一覧、右: 求人詳細パネル（並列ルート） |
| `/favorites` | お気に入り（localStorage 永続化） |
| `/history` | 検索履歴 |

### 主な機能

- @tanstack/react-virtual による仮想スクロール
- JWT ページネーション
- 8種フィルター検索
- スクロール位置復元
