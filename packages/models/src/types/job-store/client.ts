import type { InferOutput } from "valibot";
import type { cursorSchema } from "../../schemas";
import type { searchFilterSchema } from "../../schemas/job-store/client";
import type { Job } from "./jobFetch";
import type { InsertJobRequestBody } from "./jobInsert";

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
export type SearchFilter = InferOutput<typeof searchFilterSchema>;
export interface CommandOutputMap {
  InsertJob: { jobId: number };
  FindJobByNumber: { job: Job | null };
  FindJobs: {
    jobs: Job[];
    cursor: Cursor;
    meta: { totalCount: number; filter: SearchFilter };
  };
  CheckJobExists: { exists: boolean };
  CountJobs: { count: number };
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
