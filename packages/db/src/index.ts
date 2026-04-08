import { type Dialect, Kysely } from "kysely";
import type { DB } from "./generated/types";

export function createDB(dialect: Dialect): Kysely<DB> {
  return new Kysely<DB>({ dialect });
}

// クエリユーティリティ
export {
  type DailyStatRow,
  selectCrawlerRuns,
  selectDailyStats,
  selectJobDetailRuns,
} from "./queries";
// DB行スキーマ（Kysely 生成型との整合性を保証）
export {
  type DbCompanyRow,
  DbCompanyRowSchema,
  type DbCrawlerRunRow,
  DbCrawlerRunRowSchema,
  type DbJobDetailRunRow,
  DbJobDetailRunRowSchema,
  type DbJobRow,
  DbJobRowSchema,
} from "./schema";
