import { Job } from "@sho/models";
import { Either, Schema } from "effect";
import { TreeFormatter } from "effect/ParseResult";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";

// --- エラー型 ---

export type EndpointNotFoundError = {
  readonly _tag: "EndpointNotFoundError";
  readonly message: string;
};

export type FetchJobsError = {
  readonly _tag: "FetchJobsError";
  readonly message: string;
};

export type FetchJobError = {
  readonly _tag: "FetchJobError";
  readonly message: string;
};

export type ValidateJobError = {
  readonly _tag: "ValidateJobError";
  readonly message: string;
};
export type ParseJsonError = {
  readonly _tag: "ParseJsonError";
  readonly message: string;
};

export type ValidateJobsError = {
  readonly _tag: "ValidateJobsError";
  readonly message: string;
};

const createValidateJobsError = (message: string): ValidateJobsError => ({
  _tag: "ValidateJobsError",
  message,
});

const createValidateJobError = (message: string): ValidateJobError => ({
  _tag: "ValidateJobError",
  message,
});

const createParseJsonError = (message: string): ParseJsonError => ({
  _tag: "ParseJsonError",
  message,
});

const createFetchJobsError = (message: string): FetchJobsError => ({
  _tag: "FetchJobsError",
  message,
});

const createFetchJobError = (message: string): FetchJobError => ({
  _tag: "FetchJobError",
  message,
});

const createEndPointNotFoundError = (
  message: string,
): EndpointNotFoundError => ({
  _tag: "EndpointNotFoundError",
  message,
});

// --- クライアントインターフェース ---

export interface JobStoreClient {
  getInitialJobs(
    query?: JobListQuery,
  ): ResultAsync<
    JobListSuccessResponse,
    EndpointNotFoundError | FetchJobsError | ParseJsonError | ValidateJobsError
  >;

  getContinuedJobs(
    nextToken: string,
  ): ResultAsync<
    JobListSuccessResponse,
    EndpointNotFoundError | FetchJobsError | ParseJsonError | ValidateJobsError
  >;

  getJob(
    jobNumber: string,
  ): ResultAsync<
    JobFetchSuccessResponse,
    EndpointNotFoundError | FetchJobError | ParseJsonError | ValidateJobError
  >;
}

// --- スキーマ定義 ---

const searchFilterSchema = Schema.Struct({
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
export type SearchFilter = typeof searchFilterSchema.Type;

export type JobList = readonly Job[];

const jobListQuerySchema = Schema.Struct({
  ...searchFilterSchema.fields,
  employeeCountLt: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
});
export type JobListQuery = typeof jobListQuerySchema.Type;

const jobListSuccessResponseSchema = Schema.Struct({
  jobs: Schema.Array(Job),
  nextToken: Schema.optional(Schema.String),
  meta: Schema.Struct({
    totalCount: Schema.Number,
  }),
});
export type JobListSuccessResponse = typeof jobListSuccessResponseSchema.Type;

const jobFetchSuccessResponseSchema = Schema.Struct({
  ...Job.fields,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
export type JobFetchSuccessResponse = typeof jobFetchSuccessResponseSchema.Type;

// --- 実装 ---

const j = Symbol();
type JobEndPoint = { [j]: unknown } & string;
export const jobStoreClientOnServer: JobStoreClient = {
  getInitialJobs(query: JobListQuery = {}) {
    return safeTry(async function* () {
      const endpoint = yield* (() => {
        const envEndpoint = process.env.JOB_STORE_ENDPOINT;
        if (!envEndpoint) {
          return err(
            createEndPointNotFoundError("JOB_STORE_ENDPOINT is not defined"),
          );
        }
        return ok(envEndpoint as JobEndPoint);
      })();

      console.log(`query: ${JSON.stringify(query, null, 2)}`);

      const searchParams = new URLSearchParams();
      if (query.companyName) {
        searchParams.append(
          "companyName",
          encodeURIComponent(query.companyName),
        );
      }
      if (query.employeeCountGt) {
        searchParams.append("employeeCountGt", String(query.employeeCountGt));
      }
      if (query.employeeCountLt) {
        searchParams.append("employeeCountLt", String(query.employeeCountLt));
      }

      if (query.jobDescription) {
        searchParams.append("jobDescription", query.jobDescription);
      }

      if (query.jobDescriptionExclude) {
        searchParams.append(
          "jobDescriptionExclude",
          query.jobDescriptionExclude,
        );
      }

      if (query.addedSince) {
        searchParams.append("addedSince", query.addedSince);
      }

      if (query.addedUntil) {
        searchParams.append("addedUntil", query.addedUntil);
      }

      searchParams.append("orderByReceiveDate", "desc");

      const paramsObj = Object.fromEntries(searchParams.entries());

      yield* (() => {
        const result =
          Schema.decodeUnknownEither(jobListQuerySchema)(paramsObj);
        if (Either.isLeft(result)) {
          return err(
            createValidateJobsError(
              `Invalid job query. received:  ${JSON.stringify(paramsObj, null, 2)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        }
        return ok();
      })();

      const url = `${endpoint}/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      const response = yield* ResultAsync.fromPromise(fetch(url), () =>
        createFetchJobsError("Failed to fetch jobs"),
      );
      const data = yield* ResultAsync.fromPromise(response.json(), (error) =>
        createParseJsonError(`Failed to parse jobs response: ${String(error)}`),
      );

      if (!response.ok) {
        return err(
          createFetchJobsError(
            `Failed to fetch jobs.\nstatus: ${response.status}\nbody: ${JSON.stringify(data, null, 2)}`,
          ),
        );
      }

      const validatedData = yield* (() => {
        const result = Schema.decodeUnknownEither(jobListSuccessResponseSchema)(
          data,
        );
        if (Either.isLeft(result)) {
          return err(
            createValidateJobsError(
              `Invalid job data. received: ${JSON.stringify(data, null, 2)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        }
        return ok(result.right);
      })();
      return okAsync(validatedData);
    });
  },
  getContinuedJobs(nextToken: string) {
    return safeTry(async function* () {
      const endpoint = yield* (() => {
        const envEndpoint = process.env.JOB_STORE_ENDPOINT;
        if (!envEndpoint) {
          return err(
            createEndPointNotFoundError("JOB_STORE_ENDPOINT is not defined"),
          );
        }
        return ok(envEndpoint as JobEndPoint);
      })();

      const url = `${endpoint}/jobs/continue?nextToken=${nextToken}`;

      const response = yield* ResultAsync.fromPromise(fetch(url), (error) =>
        createFetchJobsError(`Failed to fetch jobs: ${String(error)}`),
      );

      const data = yield* ResultAsync.fromPromise(response.json(), (error) =>
        createParseJsonError(`Failed to parse jobs response: ${String(error)}`),
      );

      if (!response.ok) {
        return err(
          createFetchJobsError(
            `Failed to fetch jobs.\nstatus: ${response.status}\nbody: ${JSON.stringify(data, null, 2)}`,
          ),
        );
      }

      const validatedData = yield* (() => {
        const result = Schema.decodeUnknownEither(jobListSuccessResponseSchema)(
          data,
        );
        if (Either.isLeft(result)) {
          return err(
            createValidateJobsError(
              `Invalid job data. received: ${JSON.stringify(data, null, 2)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        }
        return ok(result.right);
      })();
      return okAsync(validatedData);
    });
  },
  getJob(jobNumber: string) {
    return safeTry(async function* () {
      const endpoint = yield* (() => {
        const envEndpoint = process.env.JOB_STORE_ENDPOINT;
        if (!envEndpoint) {
          return err(
            createEndPointNotFoundError("JOB_STORE_ENDPOINT is not defined"),
          );
        }
        return ok(envEndpoint as JobEndPoint);
      })();

      const url = `${endpoint}/jobs/${jobNumber}`;
      const response = yield* ResultAsync.fromPromise(fetch(url), (error) =>
        createFetchJobError(`Failed to fetch job: ${String(error)}`),
      );
      const data = yield* ResultAsync.fromPromise(response.json(), (error) =>
        createParseJsonError(`Failed to parse job response: ${String(error)}`),
      );

      if (!response.ok) {
        return err(
          createFetchJobError(
            `Failed to fetch job.\nstatus: ${response.status}\nbody: ${JSON.stringify(data, null, 2)}`,
          ),
        );
      }

      const validatedData = yield* (() => {
        const result = Schema.decodeUnknownEither(
          jobFetchSuccessResponseSchema,
        )(data);
        if (Either.isLeft(result)) {
          return err(
            createValidateJobError(
              `Invalid job data. received: ${JSON.stringify(data, null, 2)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        }
        return ok(result.right);
      })();
      return okAsync(validatedData);
    });
  },
};
