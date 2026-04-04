# アーキテクチャ

## ディレクトリ構成

```
hello-work-software-jobs/
├── apps/
│   ├── backend/
│   │   ├── api/                     # Cloudflare Workers REST API (Hono + D1)
│   │   └── collector/               # クローラー (Playwright + Effect)
│   │       └── infra/               # AWS インフラ (CDK: Lambda, SQS, EventBridge)
│   └── frontend/
│       └── hello-work-job-searcher/ # Next.js web app
├── packages/
│   ├── db/                          # Kysely + D1 client factory & DB行スキーマ
│   └── models/                      # ドメインモデル定義
```

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Next.js 16, React 19, Jotai, Hono RPC, Storybook 10 |
| API | Cloudflare Workers, Hono, Kysely, D1 (SQLite), Effect |
| Crawler | Playwright, Effect, AWS Lambda (Docker), SQS, EventBridge, CDK |
| Shared | TypeScript 5.8, Effect Schema |
| Secrets | dotenvx (API, Frontend) |
| Quality | Biome, Playwright/Vitest |

## データフロー

```
EventBridge (平日 01:00 JST = UTC 16:00 SUN-THU)
  → Lambda: job-number-crawler (Playwright)
  → SQS queue (job-detail-queue, batchSize: 1)
  → Lambda: job-detail-etl (Playwright + linkedom)
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
JobNumber, EstablishmentNumber, CorporateNumber, ReceivedDate, ExpiryDate,
EmploymentType, JobCategory, WageType, Wage, WorkingTime, EmployeeCount, HomePageUrl

// 構造体
WageRange    = { min: Wage, max: Wage }
WorkingHours = { start: NullOr(WorkingTime), end: NullOr(WorkingTime) }

Company = {
  establishmentNumber, companyName, postalCode, address,
  employeeCount, foundedYear, capital, businessDescription, corporateNumber,
}

Job = {
  // 基本情報
  jobNumber, companyName, receivedDate, expiryDate, homePage,
  occupation, employmentType, wage, workingHours,
  employeeCount, workPlace, jobDescription, qualifications,
  // 求人情報
  establishmentNumber, jobCategory, industryClassification,
  publicEmploymentOffice, onlineApplicationAccepted,
  // 仕事内容
  dispatchType, employmentPeriod, ageRequirement, education,
  requiredExperience, trialPeriod, carCommute, transferPossibility,
  // 賃金
  wageType, raise, bonus,
  // その他条件
  insurance, retirementBenefit,
}
```

## `packages/db`

Kysely 型定義 + DB行スキーマ。D1 (SQLite) 向け。

- `schema.sql` が DDL の Source of Truth
- `kysely-codegen` で `src/generated/types.ts` を自動生成（`pnpm codegen`）
- `src/schema.ts` に `DbJobRowSchema`・`DbCompanyRowSchema`・`DbCrawlerRunRowSchema`・`DbJobDetailRunRowSchema`（フラットDB行スキーマ）を定義。型レベルチェックで Kysely 生成型との整合性を保証
- ドメインモデルへの変換（`DbJobSchema`）は `api/src/cqrs/index.ts` で行う
- `src/queries.ts` に集計クエリユーティリティ（`selectDailyStats`, `selectCrawlerRuns`, `selectJobDetailRuns` 等）を提供。API 層から `sql` を直接 import しない設計
- Migrations: `packages/db/migrations/` (wrangler d1 migrations で管理)

---

## `apps/backend/api`

Cloudflare Workers + Hono。

### エンドポイント

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| GET | `/jobs` | - | 一覧取得（フィルター + ページネーション） |
| POST | `/jobs` | x-api-key | 登録 |
| GET | `/jobs/:jobNumber` | - | 個別取得 |
| GET | `/companies/:establishmentNumber` | - | 事業所取得 |
| POST | `/companies` | x-api-key | 事業所 UPSERT |
| GET | `/stats/daily` | - | 日ごとの新着求人数サマリー |

### 設計

- **CQRS**: 各操作が独立した `Effect.Service`。コマンド（`InsertJobCommand`, `UpsertCompanyCommand`）とクエリ（`FindJobByNumberQuery`, `FetchJobsPageQuery`, `FetchDailyStatsQuery`, `FindCompanyQuery`）に分離。
- **エラー**: `Data.TaggedError` で型安全なエラーハンドリング。コントローラーで `Effect.match` により分岐。
- **ページネーション**: ページ番号方式。

---

## `apps/backend/collector`

AWS Lambda (Docker) + SQS + EventBridge + Playwright + Effect サービスパターン。

### パイプライン

1. **求人番号抽出** — EventBridge (平日 01:00 JST) → Lambda `job-number-crawler` → Playwright で検索ページ走査 → SQS 送信
2. **求人詳細 ETL** — SQS (batchSize: 1) → Lambda `job-detail-etl` → Playwright で HTML 取得 → linkedom でパース → API に POST
3. **手動トリガー** — AWS CLI で Lambda invoke

### 設計

- **1 メッセージ = 1 Lambda 起動 = フレッシュなブラウザ**: Cloudflare Browser Rendering のレートリミット問題を根本解決
- **Effect.Service**: `JobDetailQueue`（SQS publish）を Effect.Service で定義。Config で環境変数を読み取り
- **構造化ログ**: `console.log(JSON.stringify({...}))` → CloudWatch Logs

### インフラ (CDK: `infra/`)

- SQS Queue (`job-detail-queue`, visibilityTimeout: 360s) + DLQ (maxReceiveCount: 3)
- Lambda `job-number-crawler` (Docker image, 2GB RAM, 15min timeout)
- Lambda `job-detail-etl` (Docker image, 2GB RAM, 5min timeout, SQS event source)
- EventBridge Rule (平日 01:00 JST)
- CloudWatch Log Groups (retention: 30日)

### CI/CD

- `deploy-collector.yml`: main push → OIDC 認証 → `cdk deploy`

---

## `apps/frontend/hello-work-job-searcher`

Next.js 16 + React 19。

### ページ

| パス | 概要 |
|------|------|
| `/jobs` | 求人一覧（検索フィルター + ページネーション + カードリスト） |
| `/jobs/[jobNumber]` | 求人詳細（戻るボタン付き） |
| `/favorites` | お気に入り（localStorage 永続化） |

### 状態管理

- **求人データ**: RSC で API から取得。URL searchParams が Source of Truth（フィルター・ページネーション）
- **お気に入り**: Jotai + localStorage（`atom.ts` に Source of Truth / Selectors / Writers を集約）

### UI コンポーネント (`src/components/ui/`)

CSS Modules + CSS Custom Properties によるス���イリング。各コンポーネントに `.stories.tsx` を同梱。

| コンポーネント | 概要 |
|--------------|------|
| Avatar | 画像 + フォールバック（sm/default/lg） |
| Badge | ラ��ル/タグ（default/secondary/outline） |
| Button | バリアント（primary/outline/ghost/danger��+ サイズ |
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

### Storybook

- `.storybook/` に設定（`@storybook/nextjs-vite`）
- `pnpm storybook` でローカル起動（port 6006）
- アドオン: a11y, docs, vitest

### 主な機能

- RSC ベースのデータ取得（`/api` プロキシ廃止、サーバーから直接 API 呼び出し）
- URL searchParams ベースのフィルター検索（検索ボタンで遷移）
- ページ番号ページネーション（onPageChange + useRouter による遷移）
- お気に入り（localStorage 永続化）
