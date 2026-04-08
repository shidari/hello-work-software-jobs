import { selectDailyStats } from "@sho/db";
import { Data, Effect, Schema } from "effect";
import { DateTime } from "luxon";
import { PAGE_SIZE } from "../constant";
import { JobStoreDB } from "../infra/db";
import {
  type Company,
  DbCompanySchema,
  DbJobSchema,
  type Job,
  type SearchFilter,
} from ".";

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

              const filtered = db
                .selectFrom("jobs")
                .$if(!!filter.companyName, (qb) =>
                  qb.where("companyName", "like", `%${filter.companyName}%`),
                )
                .$if(filter.employeeCountGt !== undefined, (qb) =>
                  qb.where("employeeCount", ">", filter.employeeCountGt!),
                )
                .$if(filter.employeeCountLt !== undefined, (qb) =>
                  qb.where("employeeCount", "<", filter.employeeCountLt!),
                )
                .$if(!!filter.jobDescription, (qb) =>
                  qb.where(
                    "jobDescription",
                    "like",
                    `%${filter.jobDescription}%`,
                  ),
                )
                .$if(!!filter.jobDescriptionExclude, (qb) =>
                  qb.where(
                    "jobDescription",
                    "not like",
                    `%${filter.jobDescriptionExclude}%`,
                  ),
                )
                .$if(!!filter.onlyNotExpired, (qb) =>
                  qb.where("expiryDate", ">", new Date().toISOString()),
                )
                .$if(!!filter.addedSince, (qb) => {
                  const result = DateTime.fromISO(filter.addedSince!, {
                    zone: "Asia/Tokyo",
                  })
                    .startOf("day")
                    .toUTC()
                    .toISO();
                  return result ? qb.where("createdAt", ">", result) : qb;
                })
                .$if(!!filter.addedUntil, (qb) => {
                  const result = DateTime.fromISO(filter.addedUntil!, {
                    zone: "Asia/Tokyo",
                  })
                    .endOf("day")
                    .toUTC()
                    .toISO();
                  return result ? qb.where("createdAt", "<", result) : qb;
                })
                .$if(!!filter.occupation, (qb) =>
                  qb.where("occupation", "like", `%${filter.occupation}%`),
                )
                .$if(!!filter.employmentType, (qb) =>
                  qb.where("employmentType", "=", filter.employmentType!),
                )
                .$if(filter.wageMin !== undefined, (qb) =>
                  qb.where("wageMin", ">=", filter.wageMin!),
                )
                .$if(filter.wageMax !== undefined, (qb) =>
                  qb.where("wageMax", "<=", filter.wageMax!),
                )
                .$if(!!filter.workPlace, (qb) =>
                  qb.where("workPlace", "like", `%${filter.workPlace}%`),
                )
                .$if(!!filter.qualifications, (qb) =>
                  qb.where(
                    "qualifications",
                    "like",
                    `%${filter.qualifications}%`,
                  ),
                )
                .$if(!!filter.jobCategory, (qb) =>
                  qb.where("jobCategory", "=", filter.jobCategory!),
                )
                .$if(!!filter.wageType, (qb) =>
                  qb.where("wageType", "=", filter.wageType!),
                )
                .$if(!!filter.education, (qb) =>
                  qb.where("education", "like", `%${filter.education}%`),
                )
                .$if(!!filter.industryClassification, (qb) =>
                  qb.where(
                    "industryClassification",
                    "like",
                    `%${filter.industryClassification}%`,
                  ),
                );

              const jobList = await filtered
                .selectAll()
                .orderBy("receivedDate", order)
                .limit(PAGE_SIZE)
                .offset(offset)
                .execute();

              const countResult = await filtered
                .select((eb) => eb.fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow();
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

export class FindCompanyQuery extends Effect.Service<FindCompanyQuery>()(
  "FindCompanyQuery",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (establishmentNumber: string) =>
          Effect.tryPromise({
            try: async (): Promise<Company | null> => {
              const data = await db
                .selectFrom("companies")
                .selectAll()
                .where("establishmentNumber", "=", establishmentNumber)
                .limit(1)
                .execute();
              const decodeDbRow = Schema.decodeUnknownSync(DbCompanySchema);
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
