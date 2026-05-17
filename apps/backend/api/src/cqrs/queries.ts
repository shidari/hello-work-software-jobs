import { selectDailyStats, sql, type SqlBool } from "@sho/db";
import { Data, Effect, Schema } from "effect";
import { PAGE_SIZE } from "../constant";
import {
  CompanyToCompanyTable,
  type DbCompany,
  type DbJob,
  JobStoreDB,
  JobToJobTable,
} from "../infra/db";
import type { SearchFilter } from "./schema";

/**
 * LIKE クエリ用: `\` で escape する pattern に整形する。
 * SQLite は default で LIKE に escape character を持たないため、必ず
 * 呼び出し側で `ESCAPE '\\'` clause を付けること (`likeRaw` / `notLikeRaw`)。
 * 単に `\%` / `\_` に置換するだけだと SQLite は `\` を literal として扱い、
 * 「`\` + wildcard」と解釈して escape が機能しない。
 * `\` 自体も `\\` にエスケープしないとユーザ入力に含まれる `\` が escape
 * character として暴発する。
 */
function escapeLike(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * `col LIKE '%pattern%' ESCAPE '\\'` を発行する。
 * Kysely の `.where(col, 'like', ...)` は ESCAPE clause を付けないため、
 * raw SQL で escape character を明示する。
 */
function likeRaw(column: string, pattern: string) {
  return sql<SqlBool>`${sql.ref(column)} LIKE ${`%${escapeLike(pattern)}%`} ESCAPE '\\'`;
}

function notLikeRaw(column: string, pattern: string) {
  return sql<SqlBool>`${sql.ref(column)} NOT LIKE ${`%${escapeLike(pattern)}%`} ESCAPE '\\'`;
}

// --- エラー ---

export class FetchJobError extends Data.TaggedError("FetchJobError")<{
  readonly message: string;
  readonly errorType: "client" | "server";
}> {}

class FetchJobListError extends Data.TaggedError("FetchJobListError")<{
  readonly message: string;
  readonly errorType: "client" | "server";
}> {}

class FetchStatsError extends Data.TaggedError("FetchStatsError")<{
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
            try: async (): Promise<DbJob | null> => {
              const data = await db
                .selectFrom("jobs")
                .selectAll()
                .where("jobNumber", "=", jobNumber)
                .limit(1)
                .execute();
              return data.length > 0
                ? Schema.encodeUnknownSync(JobToJobTable)(data[0])
                : null;
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

export class FindExistingJobNumbersQuery extends Effect.Service<FindExistingJobNumbersQuery>()(
  "FindExistingJobNumbersQuery",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (jobNumbers: readonly string[]) =>
          Effect.tryPromise({
            try: async (): Promise<string[]> => {
              if (jobNumbers.length === 0) return [];
              // D1/SQLite のパラメータ上限に備えてチャンクに分割
              const CHUNK_SIZE = 100;
              const existing: string[] = [];
              for (let i = 0; i < jobNumbers.length; i += CHUNK_SIZE) {
                const chunk = jobNumbers.slice(i, i + CHUNK_SIZE);
                const rows = await db
                  .selectFrom("jobs")
                  .select("jobNumber")
                  .where("jobNumber", "in", chunk)
                  .execute();
                for (const row of rows) existing.push(row.jobNumber);
              }
              return existing;
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

export class FetchJobsPageQuery extends Effect.Service<FetchJobsPageQuery>()(
  "FetchJobsPageQuery",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (options: { page: number; filter: SearchFilter }) =>
          Effect.tryPromise({
            try: async (): Promise<{
              jobs: DbJob[];
              meta: { totalCount: number; page: number };
            }> => {
              const { page, filter } = options;
              const offset = (page - 1) * PAGE_SIZE;

              const order =
                filter.orderByReceiveDate === undefined ||
                filter.orderByReceiveDate === "asc"
                  ? ("asc" as const)
                  : ("desc" as const);

              let query = db.selectFrom("jobs");

              if (filter.companyName) {
                query = query.where(likeRaw("companyName", filter.companyName));
              }
              if (filter.employeeCountGt !== undefined) {
                query = query.where(
                  "employeeCount",
                  ">",
                  filter.employeeCountGt,
                );
              }
              if (filter.employeeCountLt !== undefined) {
                query = query.where(
                  "employeeCount",
                  "<",
                  filter.employeeCountLt,
                );
              }
              if (filter.jobDescription) {
                query = query.where(
                  likeRaw("jobDescription", filter.jobDescription),
                );
              }
              if (filter.jobDescriptionExclude) {
                query = query.where(
                  notLikeRaw("jobDescription", filter.jobDescriptionExclude),
                );
              }
              if (filter.onlyNotExpired) {
                query = query.where(
                  "expiryDate",
                  ">",
                  new Date().toISOString(),
                );
              }
              if (filter.addedSince) {
                const d = new Date(`${filter.addedSince}T00:00:00+09:00`);
                if (!Number.isNaN(d.getTime())) {
                  query = query.where("createdAt", ">", d.toISOString());
                }
              }
              if (filter.addedUntil) {
                const d = new Date(`${filter.addedUntil}T23:59:59.999+09:00`);
                if (!Number.isNaN(d.getTime())) {
                  query = query.where("createdAt", "<", d.toISOString());
                }
              }
              if (filter.occupation) {
                query = query.where(likeRaw("occupation", filter.occupation));
              }
              if (filter.employmentType) {
                query = query.where(
                  "employmentType",
                  "=",
                  filter.employmentType,
                );
              }
              if (filter.wageMin !== undefined) {
                query = query.where("wageMin", ">=", filter.wageMin);
              }
              if (filter.wageMax !== undefined) {
                query = query.where("wageMax", "<=", filter.wageMax);
              }
              if (filter.workPlace) {
                query = query.where(likeRaw("workPlace", filter.workPlace));
              }
              if (filter.qualifications) {
                query = query.where(
                  likeRaw("qualifications", filter.qualifications),
                );
              }
              if (filter.jobCategory) {
                query = query.where("jobCategory", "=", filter.jobCategory);
              }
              if (filter.wageType) {
                query = query.where("wageType", "=", filter.wageType);
              }
              if (filter.education) {
                query = query.where(likeRaw("education", filter.education));
              }
              if (filter.industryClassification) {
                query = query.where(
                  likeRaw(
                    "industryClassification",
                    filter.industryClassification,
                  ),
                );
              }
              if (filter.establishmentNumber) {
                query = query.where(
                  "establishmentNumber",
                  "=",
                  filter.establishmentNumber,
                );
              }

              const jobList = await query
                .selectAll()
                .orderBy("receivedDate", order)
                .limit(PAGE_SIZE)
                .offset(offset)
                .execute();

              const countResult = await query
                .select((eb) => eb.fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow();
              const totalCount = countResult.count;
              return {
                jobs: jobList.map((row) =>
                  Schema.encodeUnknownSync(JobToJobTable)(row),
                ),
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

type DailyStat = {
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
            try: async (): Promise<DbCompany | null> => {
              const data = await db
                .selectFrom("companies")
                .selectAll()
                .where("establishmentNumber", "=", establishmentNumber)
                .limit(1)
                .execute();
              return data.length > 0
                ? Schema.encodeUnknownSync(CompanyToCompanyTable)(data[0])
                : null;
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
