import type { InferOutput } from "valibot";
import type { JobListSchema, JobSchema, searchFilterSchema } from "./dbClient";
import type { jobs, jobSelectSchema } from "./drizzle";
import type {
  cursorSchema,
  decodedNextTokenSchema,
} from "./endpoints/jobListContinue";
import type { insertJobRequestBodySchema } from "./endpoints/jobInsert";
import type { jobListQuerySchema } from "./endpoints/jobList";

export type Cursor = InferOutput<typeof cursorSchema>;
// --- コマンド型 ---
export type InsertJobCommand = {
  type: "InsertJob";
  payload: InsertJobRequestBody;
};
export type FindJobByNumberCommand = {
  type: "FindJobByNumber";
  jobNumber: string;
};
export type FindJobsCommand = {
  type: "FindJobs";
  options: {
    cursor?: Cursor;
    limit: number;
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
    cursor?: Cursor;
    filter: SearchFilter;
  };
};

export type JobStoreCommand =
  | InsertJobCommand
  | FindJobByNumberCommand
  | FindJobsCommand
  | CheckJobExistsCommand
  | CountJobsCommand;

// --- コマンドtypeごとのoutput型マッピング ---
// _tagは、実装側から追加してしまった、大変よろしくない
export type SearchFilter = InferOutput<typeof searchFilterSchema>;
export interface CommandOutputMap {
  InsertJob: { success: true, jobNumber: string } | { success: false; reason: "unknown", error: Error, _tag: 'InsertJobFailed' };
  FindJobByNumber: { success: true, job: Job | null } | { success: false, reason: "unknown", error: Error, _tag: 'FindJobByNumberFailed' };
  FindJobs: {
    success: true;
    jobs: Job[];
    cursor: Cursor;
    meta: { totalCount: number; filter: SearchFilter };
  } | { success: false; reason: "unknown", error: Error, _tag: 'FindJobsFailed' };
  CheckJobExists: { success: true, exists: boolean } | { success: false, reason: "unknown", error: Error, _tag: 'CheckJobExistsFailed' };
  CountJobs: { success: true, count: number } | { success: false, reason: "unknown", error: Error, _tag: 'CountJobsFailed' };
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

// 🔍 型チェック用ユーティリティ
export type KeysMustMatch<A, B> = Exclude<keyof A, keyof B> extends never
  ? Exclude<keyof B, keyof A> extends never
  ? true
  : ["Extra keys in B:", Exclude<keyof B, keyof A>]
  : ["Extra keys in A:", Exclude<keyof A, keyof B>];

type JobSelectFromDrizzle = typeof jobs.$inferSelect;

type JobSelectFromValibot = InferOutput<typeof jobSelectSchema>;

type Check = KeysMustMatch<JobSelectFromDrizzle, JobSelectFromValibot>;
// 一旦キーだけ比較してる
const _check: Check = true;

export type Job = InferOutput<typeof JobSchema>;

export type InsertJobRequestBody = InferOutput<
  typeof insertJobRequestBodySchema
>;

export type JobList = InferOutput<typeof JobListSchema>;

export type JobListQuery = InferOutput<typeof jobListQuerySchema>;

export type DecodedNextToken = InferOutput<typeof decodedNextTokenSchema>;
