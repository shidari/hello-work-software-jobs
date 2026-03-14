import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { DB } from "./generated/types";

export function createD1DB(database: D1Database): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new D1Dialect({ database }),
  });
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
