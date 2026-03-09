import type { Kysely } from "kysely";
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
    .groupBy((eb) => eb.fn("date", [eb.ref("createdAt")]))
    .orderBy("addedDate", "desc")
    .execute();

  return rows.map((row) => ({
    addedDate: row.addedDate,
    count: row.count,
    jobNumbers: row.jobNumbers ? JSON.parse(row.jobNumbers) : [],
  }));
}

export type CrawlerRunFilter = {
  since?: string;
  until?: string;
  status?: string;
  trigger?: string;
  limit?: number;
};

export async function selectCrawlerRuns(
  db: Kysely<DB>,
  filter: CrawlerRunFilter = {},
) {
  let query = db.selectFrom("crawler_runs").selectAll();
  if (filter.since) query = query.where("startedAt", ">=", filter.since);
  if (filter.until) query = query.where("startedAt", "<=", filter.until);
  if (filter.status) query = query.where("status", "=", filter.status);
  if (filter.trigger) query = query.where("trigger", "=", filter.trigger);
  return query
    .orderBy("startedAt", "desc")
    .limit(filter.limit ?? 20)
    .execute();
}

export type JobDetailRunFilter = {
  since?: string;
  until?: string;
  status?: string;
  limit?: number;
};

export async function selectJobDetailRuns(
  db: Kysely<DB>,
  filter: JobDetailRunFilter = {},
) {
  let query = db.selectFrom("job_detail_runs").selectAll();
  if (filter.since) query = query.where("startedAt", ">=", filter.since);
  if (filter.until) query = query.where("startedAt", "<=", filter.until);
  if (filter.status) query = query.where("status", "=", filter.status);
  return query
    .orderBy("startedAt", "desc")
    .limit(filter.limit ?? 20)
    .execute();
}
