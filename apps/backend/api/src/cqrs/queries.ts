import { selectDailyStats } from "@sho/db";
import { Data, Effect, Schema } from "effect";
import { DateTime } from "luxon";
import { PAGE_SIZE } from "../constant";
import { DbJobSchema, type Job, JobStoreDB, type SearchFilter } from ".";

// --- エラー ---

export class FetchJobError extends Data.TaggedError("FetchJobError")<{
  readonly message: string;
  readonly errorType: "client" | "server";
}> {}

export class FetchJobListError extends Data.TaggedError("FetchJobListError")<{
  readonly message: string;
  readonly errorType: "client" | "server";
}> {}

export class FetchStatsError extends Data.TaggedError("FetchStatsError")<{
  readonly message: string;
}> {}

// --- クエリ ---

export class FindJobByNumberQuery extends Effect.Service<FindJobByNumberQuery>()(
  "FindJobByNumberQuery",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (jobNumber: string) =>
          Effect.tryPromise({
            try: async (): Promise<Job | null> => {
              const data = await db
                .selectFrom("jobs")
                .selectAll()
                .where("jobNumber", "=", jobNumber)
                .limit(1)
                .execute();
              const decodeDbRow = Schema.decodeUnknownSync(DbJobSchema);
              return data.length > 0 ? decodeDbRow(data[0]) : null;
            },
            catch: (e) =>
              new FetchJobError({
                message: String(e),
                errorType: "server",
              }),
          }),
      };
    }),
  },
) {}

export class FetchJobsPageQuery extends Effect.Service<FetchJobsPageQuery>()(
  "FetchJobsPageQuery",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (options: { page: number; filter: SearchFilter }) =>
          Effect.tryPromise({
            try: async (): Promise<{
              jobs: Job[];
              meta: { totalCount: number; page: number };
            }> => {
              const { page, filter } = options;
              const offset = (page - 1) * PAGE_SIZE;

              const order =
                filter.orderByReceiveDate === undefined ||
                filter.orderByReceiveDate === "asc"
                  ? ("asc" as const)
                  : ("desc" as const);

              let query = db
                .selectFrom("jobs")
                .selectAll()
                .orderBy("receivedDate", order);

              query = applyFilters(query, filter);

              const jobList = await query
                .limit(PAGE_SIZE)
                .offset(offset)
                .execute();

              let countQuery = db
                .selectFrom("jobs")
                .select((eb) => eb.fn.countAll<number>().as("count"));

              countQuery = applyFilters(countQuery, filter);

              const countResult = await countQuery.executeTakeFirstOrThrow();
              const totalCount = countResult.count;

              const decodeDbRow = Schema.decodeUnknownSync(DbJobSchema);
              return {
                jobs: jobList.map((row) => decodeDbRow(row)),
                meta: { totalCount, page },
              };
            },
            catch: (e) =>
              new FetchJobListError({
                message: String(e),
                errorType: "server",
              }),
          }),
      };
    }),
  },
) {}

export type DailyStat = {
  addedDate: string;
  count: number;
  jobNumbers: string[];
};

export class FetchDailyStatsQuery extends Effect.Service<FetchDailyStatsQuery>()(
  "FetchDailyStatsQuery",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: () =>
          Effect.tryPromise({
            try: (): Promise<DailyStat[]> => selectDailyStats(db),
            catch: (e) =>
              new FetchStatsError({
                message: String(e),
              }),
          }),
      };
    }),
  },
) {}

// --- フィルタ適用ヘルパー ---

function applyFilters<T extends { $if: (...args: any[]) => T }>(
  query: T,
  filter: SearchFilter,
): T {
  return query
    .$if(!!filter.companyName, (qb: any) =>
      qb.where("companyName", "like", `%${filter.companyName}%`),
    )
    .$if(filter.employeeCountGt !== undefined, (qb: any) =>
      qb.where("employeeCount", ">", filter.employeeCountGt!),
    )
    .$if(filter.employeeCountLt !== undefined, (qb: any) =>
      qb.where("employeeCount", "<", filter.employeeCountLt!),
    )
    .$if(!!filter.jobDescription, (qb: any) =>
      qb.where("jobDescription", "like", `%${filter.jobDescription}%`),
    )
    .$if(!!filter.jobDescriptionExclude, (qb: any) =>
      qb.where(
        "jobDescription",
        "not like",
        `%${filter.jobDescriptionExclude}%`,
      ),
    )
    .$if(!!filter.onlyNotExpired, (qb: any) =>
      qb.where("expiryDate", ">", new Date().toISOString()),
    )
    .$if(!!filter.addedSince, (qb: any) => {
      const result = DateTime.fromISO(filter.addedSince!, {
        zone: "Asia/Tokyo",
      })
        .startOf("day")
        .toUTC()
        .toISO();
      return result ? qb.where("createdAt", ">", result) : qb;
    })
    .$if(!!filter.addedUntil, (qb: any) => {
      const result = DateTime.fromISO(filter.addedUntil!, {
        zone: "Asia/Tokyo",
      })
        .endOf("day")
        .toUTC()
        .toISO();
      return result ? qb.where("createdAt", "<", result) : qb;
    });
}
