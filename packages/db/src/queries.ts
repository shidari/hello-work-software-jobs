import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { DB } from "./generated/types";

export type DailyStatRow = {
  addedDate: string;
  count: number;
  jobNumbers: string[];
};

export async function selectDailyStats(
  db: Kysely<DB>,
): Promise<DailyStatRow[]> {
  const rows = await db
    .selectFrom("jobs")
    .select([
      sql<string>`date(createdAt)`.as("addedDate"),
      sql<number>`count(*)`.as("count"),
      sql<string>`group_concat(jobNumber)`.as("jobNumbers"),
    ])
    .groupBy(sql`date(createdAt)`)
    .orderBy("addedDate", "desc")
    .execute();

  return rows.map((row) => ({
    addedDate: row.addedDate,
    count: row.count,
    jobNumbers: row.jobNumbers ? row.jobNumbers.split(",") : [],
  }));
}
