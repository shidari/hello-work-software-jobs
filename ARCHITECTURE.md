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
│   ├── db/                          # Kysely DB factory & DB行スキーマ（Dialect 非依存）
│   ├── logger/                      # 3 サービス横断の構造化ログライブラリ（@sho/logger）
│   ├── mcp-ops/                     # ops MCP コンテナ image 定義 + 起動スクリプト（GitHub / CloudWatch / AWS API）
│   └── models/                      # ドメインモデル定義
├── docs/                            # プロジェクトドキュメント
├── scripts/                         # dev Apple container サンドボックス管理
└── tasks/                           # タスク / 設計メモ
```

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Next.js 16, React 19, Jotai, Hono RPC, Storybook 10 |
| API | Cloudflare Workers, Hono, Kysely, D1 (SQLite), Effect |
| Crawler | Playwright, Effect, AWS Lambda (Docker), SQS, EventBridge, CDK |
| Shared | TypeScript, Effect Schema, @sho/logger（構造化ログ） |
| Secrets | dotenvx (API, Frontend) |
| Quality | Biome, Vitest, knip |

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

ドメインモデル定義。全レイヤーから参照。2 層構造:

- **`src/raw.ts`**: バリデーション付き Raw スキーマ（brand なし）。パターン・フィルター・Union リテラル等のバリデーションをここで定義。DB 行や API レスポンスなど branded type が不要な場面で使用。
- **`src/index.ts`**: branded ドメインスキーマ。Raw スキーマに `Schema.brand()` と `.annotations()` を付与するだけ。

```typescript
// raw フィールドスキーマ（brand なし、バリデーションあり）
RawJobNumber, RawEstablishmentNumber, RawCorporateNumber, RawReceivedDate, RawExpiryDate,
RawEmploymentType, RawJobCategory, RawWageType, RawWage, RawWorkingTime, RawEmployeeCount, RawHomePageUrl

// branded types（Raw に brand + annotations を付与）
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

Kysely 型定義 + DB行スキーマ。Dialect 非依存（`createDB(dialect)` で DB クライアントを生成）。D1 固有の Dialect 組み立ては `api/src/infra/db.ts` で行う。

- `schema.sql` が DDL の Source of Truth
- `kysely-codegen` で `src/generated/types.ts` を自動生成（`pnpm codegen`）
- `src/schema.ts` に `DbJobRowSchema`・`DbCompanyRowSchema`・`DbJobAttachmentRowSchema`（フラットDB行スキーマ）を定義。型レベルチェックで Kysely 生成型との整合性を保証
- `job_attachments` テーブル: 求人票 PDF のメタデータ（バイナリ本体は R2 に保存）
- ドメインモデルへの変換（`JobToJobTable`, `CompanyToCompanyTable`）は `api/src/infra/db.ts` で行う
- `src/queries.ts` に集計クエリユーティリティ（`selectDailyStats` 等）を提供。API 層から `sql` を直接 import しない設計
- Migrations: `packages/db/migrations/` (wrangler d1 migrations で管理)

## `packages/logger`

3 サービス横断の構造化ログライブラリ（`@sho/logger`）。詳細は [.claude/rules/logger.md](.claude/rules/logger.md) / [docs/LOGGING.md](docs/LOGGING.md) を参照。

- `makeLogger(service)` → `{ LoggerLayer, runLog }` を返す。Effect の `Logger.replace` で差し替える JSON ロガー
- `logErrorCause(msg, cause)` → `Data.TaggedError` から `_tag` / `error.message` を抽出してエラーログ化
- 副作用は `console.log` / `console.error` のみ。Workers / Node / Edge いずれでも動作
- 各サービスは `src/log.ts` 等で薄いラッパを定義し、`service` 名を束縛した `LoggerLayer` / `runLog` を再エクスポートする

## `packages/mcp-ops`

ops MCP コンテナ（`sho-mcp-ops`）の image 定義。GitHub / CloudWatch / AWS API の MCP server を `sho-mcp-net` 上に expose する。詳細は [.claude/rules/cli.md](.claude/rules/cli.md) の "MCP ops コンテナ" 節を参照。

- `flake.nix` で aarch64-linux 用 OCI image を定義（bash / curl / python3 / uv / nginx / tini）
- `start.sh` が `github-mcp-server` / `awslabs.cloudwatch-mcp-server` / `awslabs.aws-api-mcp-server` を `mcp-proxy` で stdio→SSE 化
- `nginx.conf` で外向き 7001 / 7002 / 7003 に expose、`limit_req` で簡易レート制限

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
- **インフラ層**: `src/infra/db.ts` に `JobStoreDB`（Effect Context.Tag）と `createD1DB`（D1Dialect 組み立て）を集約。`JobStoreDB.main(binding)` で DB クライアントを生成。
- **エラー**: `Data.TaggedError` で型安全なエラーハンドリング。コントローラーで `Effect.match` により分岐。
- **ページネーション**: ページ番号方式。
- **ミドルウェア**: `src/middleware/` に共通ミドルウェアを集約。API キー検証（`api-key.ts`）、D1 Token Bucket レート制限（`rate-limit.ts`、API key hash / IP 単位の bucket。D1 障害時は fail-closed で 503）、セキュリティヘッダー（`security-headers.ts`）。

---

## `apps/backend/collector`

AWS Lambda (Docker) + SQS + EventBridge + Playwright + Effect サービスパターン。

### パイプライン

1. **求人番号抽出** — EventBridge (平日 01:00 JST) → Lambda `job-number-crawler` → Playwright で検索ページ走査 → SQS 送信
2. **求人詳細 ETL** — SQS (batchSize: 1) → Lambda `job-detail-etl` → Playwright で HTML 取得 → linkedom でパース → API に POST
3. **手動トリガー** — ops MCP (`ops-aws-api`, read-only) では Lambda invoke は不可。一時的に書き込みが必要な場合は host で `aws lambda invoke` を叩く

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

→ 詳細は [docs/FRONTEND.md](docs/FRONTEND.md) を参照。

Next.js 16 + React 19。RSC ベースのデータ取得、Jotai による状態管理、Storybook 10 による UI カタログ。
