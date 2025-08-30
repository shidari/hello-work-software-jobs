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
import type { ResultAsync } from "neverthrow";
import type {
  FetchJobCountError,
  FetchJobError,
  FetchJobListError,
  InsertJobDuplicationError,
  InsertJobError,
  JobNotFoundError,
} from "./error";

export type JobStoreResultBuilder = (client: JobStoreDBClient) => {
  insertJob: (
    job: InsertJobRequestBody,
  ) => ResultAsync<
    CommandOutput<InsertJobCommand>,
    InsertJobDuplicationError | InsertJobError
  >;
  fetchJob: (
    jobNumber: string,
  ) => ResultAsync<
    CommandOutput<FindJobByNumberCommand>["job"],
    FetchJobError | JobNotFoundError
  >;
  checkDuplicate: (
    jobNumber: string,
  ) => ResultAsync<
    CommandOutput<CheckJobExistsCommand>["exists"],
    InsertJobDuplicationError
  >;
  fetchJobList: (params: {
    cursor?: Cursor;
    limit: number;
    filter: SearchFilter;
  }) => ResultAsync<CommandOutput<FindJobsCommand>, FetchJobListError>;
  countJobs: (params: {
    cursor?: Cursor;
    filter: SearchFilter;
  }) => ResultAsync<CommandOutput<CountJobsCommand>, FetchJobCountError>;
};
