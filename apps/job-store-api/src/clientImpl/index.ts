import type {
  CheckJobExistsCommand,
  CommandOutput,
  CountJobsCommand,
  Cursor,
  FindJobByNumberCommand,
  FindJobsCommand,
  InsertJobCommand,
  InsertJobRequestBody,
  JobStoreDBClient,
  SearchFilter,
} from "@sho/models";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  createFetchJobError,
  createFetchJobListError,
  createInsertJobDuplicationError,
  createInsertJobError,
  createJobNotFoundError,
  createJobsCountError,
} from "./error";
import type { JobStoreResultBuilder } from "./type";

// JobStoreResultBuilderの実装（コマンドパターンで書き換え）
export const createJobStoreResultBuilder: JobStoreResultBuilder = (
  dbClient: JobStoreDBClient,
) => ({
  insertJob: (job: InsertJobRequestBody) => {
    const command: InsertJobCommand = { type: "InsertJob", payload: job };
    return ResultAsync.fromPromise(dbClient.execute(command), (error) =>
      createInsertJobError(`insert job failed.\n${String(error)}`, "server"),
    );
  },

  fetchJob: (jobNumber: string) => {
    const command: FindJobByNumberCommand = {
      type: "FindJobByNumber",
      jobNumber,
    };
    return ResultAsync.fromPromise(dbClient.execute(command), (error) =>
      createFetchJobError(
        `fetch job failed. jobNumber=${jobNumber}\n${String(error)}`,
      ),
    ).andThen((result: CommandOutput<FindJobByNumberCommand>) => {
      if (!result.job) {
        return errAsync(
          createJobNotFoundError(`Job not found for jobNumber=${jobNumber}`),
        );
      }
      return okAsync(result.job);
    });
  },

  checkDuplicate: (jobNumber: string) => {
    const command: CheckJobExistsCommand = {
      type: "CheckJobExists",
      jobNumber,
    };
    return ResultAsync.fromPromise(dbClient.execute(command), (error) =>
      createInsertJobDuplicationError(
        `check duplicate failed. jobNumber=${jobNumber}\n${String(error)}`,
        "client",
      ),
    ).map((result) => result.exists);
  },

  fetchJobList: (params: {
    cursor?: Cursor;
    limit: number;
    filter: SearchFilter;
  }) => {
    const command: FindJobsCommand = {
      type: "FindJobs",
      options: params,
    };
    return ResultAsync.fromPromise(dbClient.execute(command), (error) =>
      createFetchJobListError(`fetch job list failed.\n${String(error)}`),
    );
  },
  countJobs: (params: { cursor?: Cursor; filter: SearchFilter }) => {
    const command: CountJobsCommand = {
      type: "CountJobs",
      options: params,
    };
    return ResultAsync.fromPromise(dbClient.execute(command), (error) =>
      createJobsCountError(`count jobs failed.\n${String(error)}`),
    );
  },
});
