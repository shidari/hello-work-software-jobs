# DB (packages/db)

Kysely 型定義 + DB 行スキーマ。Dialect 非依存。

## テーブル

- `jobs` — 求人データ（フラット構造、wage は wageMin/wageMax）
- `companies` — 事業所データ
- `job_attachments` — 求人票 PDF メタデータ（バイナリは R2）

## 構成

- `schema.sql` が DDL の Source of Truth
- `src/generated/types.ts` — Kysely codegen 自動生成型
- `src/schema.ts` — Effect Schema（`DbJobRowSchema`, `DbCompanyRowSchema`, `DbJobAttachmentRowSchema`）。型レベルチェックで Kysely 生成型と整合性保証
- `src/queries.ts` — 集計クエリユーティリティ
- `migrations/` — wrangler d1 migrations で管理
