import type {
  CheckJobExistsCommand,
  CommandOutput,
  CountJobsCommand,
  FindJobByNumberCommand,
  FindJobsCommand,
  InsertJobCommand,
  JobStoreCommand,
  JobStoreDBClient,
} from "@sho/models";
import { DateTime } from "luxon";
import { and, asc, desc, eq, gt, like, lt, not, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { jobs } from "../db/schema";
import { ResultAsync } from "neverthrow";

type DrizzleD1Client = DrizzleD1Database<Record<string, never>> & {
  $client: D1Database;
};

async function handleInsertJob(
  drizzle: DrizzleD1Client,
  cmd: InsertJobCommand,
): Promise<CommandOutput<InsertJobCommand>> {
  const now = new Date();
  const insertingValues = {
    ...cmd.payload,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "active" as const,
  };
  const result = await ResultAsync.fromPromise(
    drizzle.insert(jobs).values(insertingValues).run(),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );
  if (result.isErr()) {
    return {
      success: false,
      reason: "unknown",
      error: result.error,
      _tag: "InsertJobFailed",
    };
  }
  return { success: true, jobNumber: cmd.payload.jobNumber };
}

async function handleFindJobByNumber(
  drizzle: DrizzleD1Client,
  cmd: FindJobByNumberCommand,
): Promise<CommandOutput<FindJobByNumberCommand>> {
  // ちょっとResutyAsyncの書き方わからなかったので、try-catchで
  try {
    const data = await drizzle
      .select()
      .from(jobs)
      .where(eq(jobs.jobNumber, cmd.jobNumber))
      .limit(1);
    return { success: true, job: data.length > 0 ? data[0] : null };
  } catch (error) {
    return {
      success: false,
      reason: "unknown",
      error: error instanceof Error ? error : new Error(String(error)),
      _tag: "FindJobByNumberFailed",
    };
  }
}

async function handleFindJobs(
  drizzle: DrizzleD1Client,
  cmd: FindJobsCommand,
): Promise<CommandOutput<FindJobsCommand>> {
  try {
    const { cursor, limit, filter } = cmd.options;
    const cursorConditions = cursor
      ? [
        (() => {
          switch (filter.orderByReceiveDate) {
            case "asc":
            case undefined:
              return or(
                gt(jobs.receivedDate, cursor.receivedDateByISOString),
                and(
                  eq(jobs.receivedDate, cursor.receivedDateByISOString),
                  gt(jobs.id, cursor.jobId),
                ),
              )
            case "desc": {              return or(
                lt(jobs.receivedDate, cursor.receivedDateByISOString),
                and(
                  eq(jobs.receivedDate, cursor.receivedDateByISOString),
                  lt(jobs.id, cursor.jobId),
                ),
              )
            }
          }
        })()
      ]
      : [];
    const filterConditions = [
      ...(filter.companyName
        ? [like(jobs.companyName, `%${filter.companyName}%`)]
        : []),
      ...(filter.employeeCountGt
        ? [gt(jobs.employeeCount, filter.employeeCountGt)]
        : []),
      ...(filter.employeeCountLt
        ? [lt(jobs.employeeCount, filter.employeeCountLt)]
        : []),
      ...(filter.jobDescription
        ? [like(jobs.jobDescription, `%${filter.jobDescription}%`)]
        : []),
      ...(filter.jobDescriptionExclude
        ? [not(like(jobs.jobDescription, `%${filter.jobDescriptionExclude}%`))]
        : []),
      ...(filter.onlyNotExpired
        ? [gt(jobs.expiryDate, new Date().toISOString())]
        : []),
      ...(filter.addedSince
        ? (() => {
          const result = DateTime.fromISO(filter.addedSince, {
            zone: "Asia/Tokyo",
          })
            .startOf("day")
            .toUTC()
            .toISO();
          return result ? [gt(jobs.createdAt, result)] : [];
        })()
        : []),
      ...(filter.addedUntil
        ? (() => {
          const result = DateTime.fromISO(filter.addedUntil, {
            zone: "Asia/Tokyo",
          })
            .endOf("day")
            .toUTC()
            .toISO();
          return result ? [lt(jobs.createdAt, result)] : [];
        })()
        : []),
    ];

    const conditions = [...cursorConditions, ...filterConditions];

    const order =
      filter.orderByReceiveDate === undefined ||
        filter.orderByReceiveDate === "asc"
        ? asc(jobs.receivedDate)
        : desc(jobs.receivedDate);
    const query = drizzle.select().from(jobs).orderBy(order);

    const jobList =
      conditions.length > 0
        ? await query.where(and(...conditions)).limit(limit)
        : await query.limit(limit);

    const totalCount = await drizzle.$count(
      jobs,
      filterConditions.length > 0 ? and(...filterConditions) : undefined,
    );

    return {
      success: true,
      jobs: jobList,
      cursor: {
        jobId: jobList.length > 0 ? jobList[jobList.length - 1].id : 1,
        receivedDateByISOString:
          jobList.length > 0
            ? jobList[jobList.length - 1].receivedDate
            : new Date().toISOString(),
      },
      meta: {
        totalCount,
        filter,
      },
    };
  } catch (error) {
    return {
      success: false,
      reason: "unknown",
      error: error instanceof Error ? error : new Error(String(error)),
      _tag: "FindJobsFailed",
    };
  }
}

async function handleCheckJobExists(
  drizzle: DrizzleD1Client,
  cmd: CheckJobExistsCommand,
): Promise<CommandOutput<CheckJobExistsCommand>> {
  try {
    const rows = await drizzle
      .select()
      .from(jobs)
      .where(eq(jobs.jobNumber, cmd.jobNumber))
      .limit(1);
    return { success: true, exists: rows.length > 0 };
  } catch (error) {
    return {
      success: false,
      reason: "unknown",
      error: error instanceof Error ? error : new Error(String(error)),
      _tag: "CheckJobExistsFailed",
    };
  }
}

async function handleCountJobs(
  drizzle: DrizzleD1Client,
  cmd: CountJobsCommand,
): Promise<CommandOutput<CountJobsCommand>> {
  const conditions = [];
  const { cursor, filter } = cmd.options;
  if (cursor) {
    if (
      filter.orderByReceiveDate === undefined ||
      filter.orderByReceiveDate === "asc"
    ) {
      conditions.push(gt(jobs.id, cursor.jobId)); // 古→新
    } else {
      conditions.push(lt(jobs.id, cursor.jobId)); // 新→古
    }
  }
  if (filter.companyName) {
    conditions.push(like(jobs.companyName, `%${filter.companyName}%`));
  }
  if (filter.employeeCountGt !== undefined) {
    conditions.push(gt(jobs.employeeCount, filter.employeeCountGt));
  }
  if (filter.employeeCountLt !== undefined) {
    conditions.push(lt(jobs.employeeCount, filter.employeeCountLt));
  }
  if (filter.jobDescription !== undefined) {
    conditions.push(like(jobs.jobDescription, `%${filter.jobDescription}%`));
  }
  if (filter.jobDescriptionExclude !== undefined) {
    conditions.push(
      not(like(jobs.jobDescription, `%${filter.jobDescriptionExclude}%`)),
    );
  }
  try {
    const resCount = await drizzle.$count(jobs, and(...conditions));
    return { success: true, count: resCount };
  } catch (error) {
    return {
      success: false,
      reason: "unknown",
      error: error instanceof Error ? error : new Error(String(error)),
      _tag: "CountJobsFailed",
    };
  }
}

// --- アダプタ本体 ---
export const createJobStoreDBClientAdapter = (
  drizzleClient: DrizzleD1Client,
): JobStoreDBClient => ({
  execute: async <T extends JobStoreCommand>(
    cmd: T,
  ): Promise<CommandOutput<T>> => {
    switch (cmd.type) {
      case "InsertJob":
        return (await handleInsertJob(
          drizzleClient,
          cmd as InsertJobCommand,
        )) as CommandOutput<T>;
      case "FindJobByNumber":
        return (await handleFindJobByNumber(
          drizzleClient,
          cmd as FindJobByNumberCommand,
        )) as CommandOutput<T>;
      case "FindJobs":
        return (await handleFindJobs(
          drizzleClient,
          cmd as FindJobsCommand,
        )) as CommandOutput<T>;
      case "CheckJobExists":
        return (await handleCheckJobExists(
          drizzleClient,
          cmd as CheckJobExistsCommand,
        )) as CommandOutput<T>;
      case "CountJobs":
        return (await handleCountJobs(
          drizzleClient,
          cmd as CountJobsCommand,
        )) as CommandOutput<T>;
      default: {
        const _exhaustive: never = cmd;
        throw new Error("Unknown command type");
      }
    }
  },
});
