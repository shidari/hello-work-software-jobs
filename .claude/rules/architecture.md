# アーキテクチャ

## データフロー

```
EventBridge (平日)
  → 求人番号抽出 Lambda (Playwright)
  → SQS キュー
  → 求人詳細 ETL Lambda (Playwright + linkedom)
  → POST /api/v1/jobs
  → Job Store API (Cloudflare Workers + D1)
  → GET /api/v1/jobs
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

Drizzle ORM スキーマ。D1 (SQLite) 向け。

DB はフラット構造（`wageMin`, `wageMax`, `workingStartTime`, `workingEndTime`）。
ドメインモデルとの変換は `job-store-api/src/adapters/index.ts` で行う。

---

## `apps/backend/job-store-api`

Cloudflare Workers + Hono。

### エンドポイント

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| GET | `/api/v1/jobs` | - | 一覧取得（フィルター + ページネーション） |
| POST | `/api/v1/jobs` | x-api-key | 登録 |
| GET | `/api/v1/jobs/:jobNumber` | - | 個別取得 |
| GET | `/api/v1/jobs/continue` | - | ページネーション継続 |

### 設計

- **アダプタ**: コマンドパターン。`InsertJob`, `FindJobByNumber`, `FetchJobsPage`, `CheckJobExists`, `CountJobs` の 5 コマンド。型に応じた結果型が推論される。
- **ページネーション**: JWT にページ番号とフィルターを埋め込み（15分有効、HS256）。セッション不要。

---

## `apps/backend/headless-crawler`

AWS Lambda + Effect サービスパターン。

### パイプライン

1. **求人番号抽出** — EventBridge → Lambda (480s) → Playwright で検索ページ走査 → SQS 送信
2. **求人詳細 ETL** — SQS → Lambda (30s) → Playwright で HTML 取得 → linkedom でパース → API に POST

### インフラ (CDK)

- Lambda x2 + Playwright レイヤー
- SQS キュー（リトライ 3回 → DLQ）
- DLQ 監視 Lambda → GitHub Issues + SNS メール
- CloudWatch アラーム

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
