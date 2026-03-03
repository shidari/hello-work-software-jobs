import type { DB } from "@sho/db";
import type { Job as DomainJobType } from "@sho/models";
import { Schema } from "effect";
import type { Kysely } from "kysely";
import { DateTime } from "luxon";
import { ResultAsync } from "neverthrow";
import { PAGE_SIZE } from "../constant";

// --- スキーマ ---

// DB行はフラット構造（wageMin, wageMax, workingStartTime, workingEndTime）
const DbJobRowSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.String,
  expiryDate: Schema.String,
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.String,
  employmentType: Schema.String,
  wageMin: Schema.NullOr(Schema.Number),
  wageMax: Schema.NullOr(Schema.Number),
  workingStartTime: Schema.NullOr(Schema.String),
  workingEndTime: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.Number),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

type DbJobRow = typeof DbJobRowSchema.Type;

// DB行 → ドメインモデル（ネスト構造）に変換
function dbRowToJob(row: DbJobRow): Job {
  return {
    ...row,
    wage:
      row.wageMin != null && row.wageMax != null
        ? { min: row.wageMin, max: row.wageMax }
        : null,
    workingHours:
      row.workingStartTime != null || row.workingEndTime != null
        ? { start: row.workingStartTime, end: row.workingEndTime }
        : null,
  } as Job;
}

// ドメインモデル → DB行（フラット構造）に変換
function domainJobToDbValues(payload: InsertJobRequestBody) {
  return {
    jobNumber: payload.jobNumber,
    companyName: payload.companyName,
    receivedDate: payload.receivedDate,
    expiryDate: payload.expiryDate,
    homePage: payload.homePage,
    occupation: payload.occupation,
    employmentType: payload.employmentType,
    wageMin: payload.wage?.min ?? null,
    wageMax: payload.wage?.max ?? null,
    workingStartTime: payload.workingHours?.start ?? null,
    workingEndTime: payload.workingHours?.end ?? null,
    employeeCount: payload.employeeCount,
    workPlace: payload.workPlace,
    jobDescription: payload.jobDescription,
    qualifications: payload.qualifications,
  };
}

// --- 型定義 ---

export type SearchFilter = {
  companyName?: string;
  employeeCountLt?: number;
  employeeCountGt?: number;
  jobDescription?: string;
  jobDescriptionExclude?: string;
  onlyNotExpired?: boolean;
  orderByReceiveDate?: "asc" | "desc";
  addedSince?: string;
  addedUntil?: string;
};

export type Job = DbJobRow & {
  wage: { min: number; max: number } | null;
  workingHours: { start: string | null; end: string | null } | null;
};
export type InsertJobRequestBody = DomainJobType;

// --- コマンド型 ---

export type InsertJobCommand = {
  type: "InsertJob";
  payload: InsertJobRequestBody;
};
export type FindJobByNumberCommand = {
  type: "FindJobByNumber";
  jobNumber: string;
};
export type FetchJobsPageCommand = {
  type: "FetchJobsPage";
  options: {
    page: number;
    filter: SearchFilter;
  };
};
export type CheckJobExistsCommand = {
  type: "CheckJobExists";
  jobNumber: string;
};
export type CountJobsCommand = {
  type: "CountJobs";
  options: {
    page: number;
    filter: SearchFilter;
  };
};

export type JobStoreCommand =
  | InsertJobCommand
  | FindJobByNumberCommand
  | FetchJobsPageCommand
  | CheckJobExistsCommand
  | CountJobsCommand;

export interface CommandOutputMap {
  InsertJob:
    | { success: true; jobNumber: string }
    | {
        success: false;
        reason: "unknown";
        error: Error;
        _tag: "InsertJobFailed";
      };
  FindJobByNumber:
    | { success: true; job: Job | null }
    | {
        success: false;
        reason: "unknown";
        error: Error;
        _tag: "FindJobByNumberFailed";
      };
  FetchJobsPage:
    | {
        success: true;
        jobs: Job[];
        meta: { totalCount: number; filter: SearchFilter; page: number };
      }
    | {
        success: false;
        reason: "unknown";
        error: Error;
        _tag: "FetchJobsPageFailed";
      };
  CheckJobExists:
    | { success: true; exists: boolean }
    | {
        success: false;
        reason: "unknown";
        error: Error;
        _tag: "CheckJobExistsFailed";
      };
  CountJobs:
    | { success: true; count: number }
    | {
        success: false;
        reason: "unknown";
        error: Error;
        _tag: "CountJobsFailed";
      };
}

export type CommandOutput<T extends JobStoreCommand> = T extends {
  type: infer U;
}
  ? U extends keyof CommandOutputMap
    ? CommandOutputMap[U]
    : never
  : never;

export type JobStoreDBClient = {
  execute: <T extends JobStoreCommand>(cmd: T) => Promise<CommandOutput<T>>;
};

// --- 実装 ---

type KyselyD1Client = Kysely<DB>;

async function handleInsertJob(
  db: KyselyD1Client,
  cmd: InsertJobCommand,
): Promise<CommandOutput<InsertJobCommand>> {
  const now = new Date();
  const insertingValues = {
    ...domainJobToDbValues(cmd.payload),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "active" as const,
  };
  const result = await ResultAsync.fromPromise(
    db.insertInto("jobs").values(insertingValues).execute(),
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
  db: KyselyD1Client,
  cmd: FindJobByNumberCommand,
): Promise<CommandOutput<FindJobByNumberCommand>> {
  try {
    const data = await db
      .selectFrom("jobs")
      .selectAll()
      .where("jobNumber", "=", cmd.jobNumber)
      .limit(1)
      .execute();
    const decodeDbRow = Schema.decodeUnknownSync(DbJobRowSchema);
    return {
      success: true,
      job: data.length > 0 ? dbRowToJob(decodeDbRow(data[0])) : null,
    };
  } catch (error) {
    return {
      success: false,
      reason: "unknown",
      error: error instanceof Error ? error : new Error(String(error)),
      _tag: "FindJobByNumberFailed",
    };
  }
}

async function handleFetchJobsPage(
  db: KyselyD1Client,
  cmd: FetchJobsPageCommand,
): Promise<CommandOutput<FetchJobsPageCommand>> {
  try {
    const { page, filter } = cmd.options;
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

    query = query
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
        qb.where("jobDescription", "like", `%${filter.jobDescription}%`),
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
      });

    const jobList = await query.limit(PAGE_SIZE).offset(offset).execute();

    // count クエリも同じフィルタを適用
    let countQuery = db
      .selectFrom("jobs")
      .select((eb) => eb.fn.countAll<number>().as("count"));

    countQuery = countQuery
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
        qb.where("jobDescription", "like", `%${filter.jobDescription}%`),
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
      });

    const countResult = await countQuery.executeTakeFirstOrThrow();
    const totalCount = countResult.count;

    const decodeDbRow = Schema.decodeUnknownSync(DbJobRowSchema);
    return {
      success: true,
      jobs: jobList.map((row) => dbRowToJob(decodeDbRow(row))),
      meta: {
        totalCount,
        filter,
        page,
      },
    };
  } catch (error) {
    return {
      success: false,
      reason: "unknown",
      error: error instanceof Error ? error : new Error(String(error)),
      _tag: "FetchJobsPageFailed",
    };
  }
}

async function handleCheckJobExists(
  db: KyselyD1Client,
  cmd: CheckJobExistsCommand,
): Promise<CommandOutput<CheckJobExistsCommand>> {
  try {
    const rows = await db
      .selectFrom("jobs")
      .selectAll()
      .where("jobNumber", "=", cmd.jobNumber)
      .limit(1)
      .execute();
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
  db: KyselyD1Client,
  cmd: CountJobsCommand,
): Promise<CommandOutput<CountJobsCommand>> {
  const { filter } = cmd.options;
  try {
    let query = db
      .selectFrom("jobs")
      .select((eb) => eb.fn.countAll<number>().as("count"));

    query = query
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
        qb.where("jobDescription", "like", `%${filter.jobDescription}%`),
      )
      .$if(!!filter.jobDescriptionExclude, (qb) =>
        qb.where(
          "jobDescription",
          "not like",
          `%${filter.jobDescriptionExclude}%`,
        ),
      );

    const result = await query.executeTakeFirstOrThrow();
    return { success: true, count: result.count };
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
  db: KyselyD1Client,
): JobStoreDBClient => ({
  execute: async <T extends JobStoreCommand>(
    cmd: T,
  ): Promise<CommandOutput<T>> => {
    switch (cmd.type) {
      case "InsertJob":
        return (await handleInsertJob(
          db,
          cmd as InsertJobCommand,
        )) as CommandOutput<T>;
      case "FindJobByNumber":
        return (await handleFindJobByNumber(
          db,
          cmd as FindJobByNumberCommand,
        )) as CommandOutput<T>;
      case "FetchJobsPage":
        return (await handleFetchJobsPage(
          db,
          cmd as FetchJobsPageCommand,
        )) as CommandOutput<T>;
      case "CheckJobExists":
        return (await handleCheckJobExists(
          db,
          cmd as CheckJobExistsCommand,
        )) as CommandOutput<T>;
      case "CountJobs":
        return (await handleCountJobs(
          db,
          cmd as CountJobsCommand,
        )) as CommandOutput<T>;
      default: {
        const _exhaustive: never = cmd;
        throw new Error("Unknown command type");
      }
    }
  },
});
