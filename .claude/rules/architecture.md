# アーキテクチャ

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
- `src/schema.ts` に `DbJobRowSchema`・`DbCrawlerRunRowSchema`・`DbJobDetailRunRowSchema`（フラットDB行スキーマ）を定義。型レベルチェックで Kysely 生成型との整合性を保証
- ドメインモデルへの変換（`DbJobSchema`）は `api/src/cqrs/index.ts` で行う
- `src/queries.ts` に集計クエリユーティリティ（`selectDailyStats`, `selectCrawlerRuns`, `selectJobDetailRuns` 等）を提供。API 層から `sql` を直接 import しない設計

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

AWS Lambda (Docker) + SQS + EventBridge + Playwright + Effect サービスパターン。

### パイプライン

1. **求人番号抽出** — EventBridge (平日 01:00 JST) → Lambda `job-number-crawler` → Playwright で検索ページ走査 → SQS 送信
2. **求人詳細 ETL** — SQS (batchSize: 1) → Lambda `job-detail-etl` → Playwright で HTML 取得 → linkedom でパース → API に POST
3. **手動トリガー** — hwctl → Lambda invoke（未実装）

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

## `tools/hwctl`

Haskell (Stack) 製の admin CLI。AI エージェントフレンドリー設計（JSON デフォルト出力）。

### コマンド

| コマンド | 概要 |
|---------|------|
| `hwctl jobs list [--page N] [--keyword TEXT] [--table]` | 求人一覧取得 |
| `hwctl jobs get <jobNumber> [--table]` | 個別求人取得 |
| `hwctl stats daily [FILTER_JSON] [--table]` | 日ごとの新着求人数サマリー |
| `hwctl queue status [--table]` | Cloudflare Queue 状態取得 |
| `hwctl logs tail [OPTIONS_JSON] [--table]` | Worker Tail セッション作成 |
| `hwctl crawler run [OPTIONS_JSON]` | クローラー手動トリガー (`{"period":"week","maxCount":50}`) |
| `hwctl crawler history [FILTER_JSON] [--table]` | クローラー実行履歴（JSON フィルター: since, until, status, trigger, limit） |
| `hwctl job-detail history [FILTER_JSON] [--table]` | 求人詳細 ETL 実行履歴（JSON フィルター: since, until, status, limit） |
| `hwctl queue dlq [--table]` | DLQ 状態取得 |
| `hwctl queue dlq-pull [--batch-size N]` | DLQ メッセージ取得 |
| `hwctl job-detail run <jobNumber>` | 求人番号をETLキューに送信 |

### 設計

- **デフォルト JSON 出力**: `--table` で human-readable テーブル表示に切替
- **構造化エラー**: `{ "error": { "code": "...", "message": "..." } }` を stderr に出力
- **終了コード**: 0=成功, 1=エラー
- **設定**: `.env` ファイル（dotenv-hs で自動読み込み）+ 環境変数。`HWCTL_ENDPOINT` (デフォルト: `http://localhost:8787`), `HWCTL_API_KEY`, `HWCTL_COLLECTOR_ENDPOINT`, `HWCTL_CF_ACCOUNT_ID`, `HWCTL_CF_API_TOKEN`, `HWCTL_CF_QUEUE_ID`, `HWCTL_CF_DLQ_ID`

---

## `apps/frontend/hello-work-job-searcher`

Next.js 16 + React 19。

### ページ

| パス | 概要 |
|------|------|
| `/jobs` | サイドバー（検索バー + 求人一覧）+ メイン（求人詳細パネル） |
| `/favorites` | お気に入り（localStorage 永続化） |
| `/history` | 検索履歴 |

### 状態管理 (Jotai)

```
atom/
  atoms.ts      — state atoms (searchFilter, jobList, job, favoriteJobs)
  selectors.ts  — derived read atoms (jobTotalCountSelector, jobOverviewListSelector)
  writers.ts    — write atoms (jobListInitWriter, jobListWriter, jobSelectWriter, favoriteAppendWriter, favoriteRemoveWriter)
```

### 主な機能

- ページ番号ページネーション（shadcn 風 Pagination コンポーネント）
- 14種フィルター検索
- お気に入り（localStorage 永続化）
