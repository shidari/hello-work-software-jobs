import type z from "zod";
import type { searchFilterSchema } from "../../schemas";
import type { Job } from "./jobFetch";
import type { InsertJobRequestBody } from "./jobInsert";

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
    cursor?: { jobId: number };
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
    cursor?: { jobId: number };
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
export type SearchFilter = z.infer<typeof searchFilterSchema>;
export interface CommandOutputMap {
  InsertJob: { jobId: number };
  FindJobByNumber: { job: Job | null };
  FindJobs: {
    jobs: Job[];
    cursor: { jobId: number };
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
