# API (apps/backend/api)

Cloudflare Workers + Hono + D1。

## エンドポイント

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| GET | `/jobs` | - | 一覧取得（フィルター + ページネーション） |
| POST | `/jobs` | x-api-key | 登録 |
| POST | `/jobs/exists` | x-api-key | 登録済み求人番号の判定（collector の重複抑制用、内部 API） |
| GET | `/jobs/:jobNumber` | - | 個別取得 |
| GET | `/companies/:establishmentNumber` | - | 事業所取得 |
| POST | `/companies` | x-api-key | 事業所 UPSERT |
| GET | `/stats/daily` | - | 日ごとの新着求人数サマリー |

## 設計

- **CQRS**: コマンド（`InsertJobCommand`, `UpsertCompanyCommand`）とクエリ（`FindJobByNumberQuery`, `FetchJobsPageQuery`, `FetchDailyStatsQuery`, `FindCompanyQuery`）に分離
- **インフラ層**: `src/infra/db.ts` に `JobStoreDB` + `JobToJobTable` / `CompanyToCompanyTable`（`Schema.transform` で RawJob ↔ DbJobRowSchema の双方向変換）
- **ミドルウェア**: `src/middleware/` に API キー検証、D1 Token Bucket レート制限、セキュリティヘッダー
- **エラー**: `Data.TaggedError` + `Effect.match` で分岐

## テスト方針

**ユースケース単位でテストを書く**。新規機能・修正を入れる時、テストは原則として CQRS 層（`src/cqrs/commands.ts` / `src/cqrs/queries.ts`）の Effect.Service を直接 invoke するレベルで書く。HTTP 経由 (`workerFetch`) のテストは「ルーティング・バリデータ・ステータスコード」の確認に絞り、ビジネスロジックの正常系・異常系の網羅は usecase テストで担保する。

| 対象 | 書く場所 | 役割 |
|------|---------|------|
| CQRS Command / Query 単体（正常系・異常系） | `test/usecase.spec.ts` | ユースケース本体の振る舞い網羅。`Effect.provide(X.Default)` + `Effect.provideService(JobStoreDB, JobStoreDB.main(env.DB))` で組み立てて `run` を直接呼ぶ |
| HTTP ルーティング / バリデータ / ステータスコード | `test/unit.spec.ts` | エンドポイント単位で `workerFetch` 経由。query / param / body のスキーマ違反が 400 / 401 / 404 / 409 を返すか等 |
| 攻撃ベクター | `test/pentest.spec.ts` | rate-limit race / api-key bypass / detail leak 等 |

理由:
- ビジネスロジックは HTTP 表面より深いところに居る。HTTP 層に張り付くと、フィルタ網羅やエッジケース検証のたびに URL / クエリパラメータ / レスポンス JSON の往復が挟まり、シグナルが薄まる
- CQRS の `Effect.Service` は依存注入が型で閉じているので、`JobStoreDB` を本物の D1 で差し込んだまま単体テストとして走る
- 失敗パス (`Data.TaggedError`) は `Effect.exit` で `Exit.isFailure` を見れば observable。HTTP 経由だと 500 にすり潰されて区別できない

異常系を書くときは catch arm を実際に発火させる（例: `InsertJobCommand` を同じ jobNumber で 2 度呼んで UNIQUE 制約に当てる）。DB 障害シミュレーションが必要な分岐は、現状は coverage を諦めて `// catch arm: DB 障害時のみ` のコメントだけ残す。

## コマンド

```bash
pnpm dev               # Wrangler dev server (port 8787)
pnpm deploy            # Deploy to Cloudflare
pnpm test              # Vitest tests
pnpm migrate           # D1 マイグレーション適用（本番）
pnpm migrate:local     # D1 マイグレーション適用（ローカル）
```
