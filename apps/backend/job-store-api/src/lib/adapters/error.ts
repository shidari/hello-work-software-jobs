export const createInsertJobDuplicationError = (
  message: string,
  errorType: "client" | "server" = "client",
): InsertJobDuplicationError => ({
  _tag: "InsertJobDuplicationError",
  message,
  errorType,
});

export const createFetchJobError = (
  message: string,
  errorType: "client" | "server" = "server",
): FetchJobError => ({
  _tag: "FetchJobError",
  message,
  errorType,
});

export const createJobNotFoundError = (
  message: string,
  errorType: "client" | "server" = "client",
): JobNotFoundError => ({
  _tag: "JobNotFoundError",
  message,
  errorType,
});

export const createFetchJobListError = (
  message: string,
  errorType: "client" | "server" = "server",
): FetchJobListError => ({
  _tag: "FetchJobListError",
  message,
  errorType,
});

export const createInsertJobError = (
  message: string,
  errorType: "client" | "server" = "server",
): InsertJobError => ({
  _tag: "InsertJobError",
  message,
  errorType,
});

export const createJobsCountError = (
  message: string,
  errorType: "server" = "server",
): FetchJobCountError => ({
  _tag: "FetchJobCountError",
  message,
  errorType,
});

export type InsertJobError = {
  readonly _tag: "InsertJobError";
  readonly message: string;
  readonly errorType: "client" | "server";
};

export type InsertJobDuplicationError = {
  readonly _tag: "InsertJobDuplicationError";
  readonly message: string;
  readonly errorType: "client" | "server";
};

export type FetchJobError = {
  readonly _tag: "FetchJobError";
  readonly message: string;
  readonly errorType: "client" | "server";
};

export type JobNotFoundError = {
  readonly _tag: "JobNotFoundError";
  readonly message: string;
  readonly errorType: "client" | "server";
};

export type FetchJobListError = {
  readonly _tag: "FetchJobListError";
  readonly message: string;
  readonly errorType: "client" | "server";
};

export type FetchJobCountError = {
  readonly _tag: "FetchJobCountError";
  readonly message: string;
  readonly errorType: "server";
};

// エラーユニオン型
export type JobStoreErrors =
  | InsertJobError
  | InsertJobDuplicationError
  | FetchJobError
  | JobNotFoundError
  | FetchJobListError
  | FetchJobCountError;
