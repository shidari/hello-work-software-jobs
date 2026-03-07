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
    .select((eb) => [
      eb.fn<string>("date", [eb.ref("createdAt")]).as("addedDate"),
      eb.fn.countAll<number>().as("count"),
      eb.fn<string>("json_group_array", [eb.ref("jobNumber")]).as("jobNumbers"),
    ])
    .groupBy(sql`date(createdAt)`)
    .orderBy("addedDate", "desc")
    .execute();

  return rows.map((row) => ({
    addedDate: row.addedDate,
    count: row.count,
    jobNumbers: row.jobNumbers ? JSON.parse(row.jobNumbers) : [],
  }));
}
