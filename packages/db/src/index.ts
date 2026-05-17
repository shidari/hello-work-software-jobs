import { type Dialect, Kysely } from "kysely";
import type { DB } from "./generated/types";

export function createDB(dialect: Dialect): Kysely<DB> {
  return new Kysely<DB>({ dialect });
}

// raw SQL helper を再 export。kysely 直 import を許す代わりに API パッケージから
// 利用させる ( ESCAPE clause を持つ LIKE 等で必要 )。
export { sql, type SqlBool } from "kysely";

// クエリユーティリティ
export { type DailyStatRow, selectDailyStats } from "./queries";
// DB行スキーマ（Kysely 生成型との整合性を保証）
export {
  type DbCompanyRow,
  DbCompanyRowSchema,
  type DbJobAttachmentRow,
  DbJobAttachmentRowSchema,
  type DbJobRow,
  DbJobRowSchema,
} from "./schema";
