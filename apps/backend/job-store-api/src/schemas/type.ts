import { Job as DomainJob, type Job as DomainJobType } from "@sho/models";
import { Schema } from "effect";

// --- 共有スキーマ (adapters / routes で使用) ---

export const searchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.Number.pipe(Schema.int())),
  employeeCountGt: Schema.optional(Schema.Number.pipe(Schema.int())),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  onlyNotExpired: Schema.optional(Schema.Boolean),
  orderByReceiveDate: Schema.optional(
    Schema.Union(Schema.Literal("asc"), Schema.Literal("desc")),
  ),
  addedSince: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
  ),
  addedUntil: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
  ),
});

export const JobSchema = Schema.Struct({
  ...DomainJob.fields,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// --- 型エイリアス ---

export type SearchFilter = typeof searchFilterSchema.Type;
export type Job = typeof JobSchema.Type;
export type InsertJobRequestBody = DomainJobType;
export type JobList = readonly Job[];
export type DecodedNextToken = {
  readonly iss: string;
  readonly iat: number;
  readonly nbf: number;
  readonly exp: number;
  readonly page: number;
  readonly filter: SearchFilter;
};

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

// --- コマンドtypeごとのoutput型マッピング ---
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

// --- typeからoutput型を推論 ---
export type CommandOutput<T extends JobStoreCommand> = T extends {
  type: infer U;
}
  ? U extends keyof CommandOutputMap
    ? CommandOutputMap[U]
    : never
  : never;

// --- コマンドパターンなDBクライアント ---
export type JobStoreDBClient = {
  execute: <T extends JobStoreCommand>(cmd: T) => Promise<CommandOutput<T>>;
};
