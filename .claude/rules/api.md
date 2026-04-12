# API (apps/backend/api)

Cloudflare Workers + Hono + D1。

## エンドポイント

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| GET | `/jobs` | - | 一覧取得（フィルター + ページネーション） |
| POST | `/jobs` | x-api-key | 登録 |
| GET | `/jobs/:jobNumber` | - | 個別取得 |
| GET | `/companies/:establishmentNumber` | - | 事業所取得 |
| POST | `/companies` | x-api-key | 事業所 UPSERT |
| GET | `/stats/daily` | - | 日ごとの新着求人数サマリー |

## 設計

- **CQRS**: コマンド（`InsertJobCommand`, `UpsertCompanyCommand`）とクエリ（`FindJobByNumberQuery`, `FetchJobsPageQuery`, `FetchDailyStatsQuery`, `FindCompanyQuery`）に分離
- **インフラ層**: `src/infra/db.ts` に `JobStoreDB` + `JobToJobTable` / `CompanyToCompanyTable`（`Schema.transform` で RawJob ↔ DbJobRowSchema の双方向変換）
- **ミドルウェア**: `src/middleware/` に API キー検証、D1 Token Bucket レート制限、セキュリティヘッダー
- **エラー**: `Data.TaggedError` + `Effect.match` で分岐

## コマンド

```bash
pnpm dev               # Wrangler dev server (port 8787)
pnpm deploy            # Deploy to Cloudflare
pnpm test              # Vitest tests
pnpm migrate           # D1 マイグレーション適用（本番）
pnpm migrate:local     # D1 マイグレーション適用（ローカル）
```
