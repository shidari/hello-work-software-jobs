import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import * as v from "valibot";
import {
  type JobListQuery,
  jobFetchSuccessResponseSchema,
  jobListQuerySchema,
  jobListSuccessResponseSchema,
} from "@/schemas";
import {
  createEndPointNotFoundError,
  createFetchJobError,
  createFetchJobsError,
  createParseJsonError,
  createValidateJobError,
  createValidateJobsError,
  type JobStoreClient,
} from "./type";

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
        const result = v.safeParse(jobListQuerySchema, paramsObj);
        if (!result.success) {
          return err(
            createValidateJobsError(
              `Invalid job query. received:  ${JSON.stringify(paramsObj, null, 2)}\n${result.issues.map((issue) => issue.message).join("\n")}`,
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
        const result = v.safeParse(jobListSuccessResponseSchema, data);
        if (!result.success) {
          return err(
            createValidateJobsError(
              `Invalid job data. received: ${JSON.stringify(data, null, 2)}\n${result.issues.map((issue) => issue.message).join("\n")}`,
            ),
          );
        }
        return ok(result.output);
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
        const result = v.safeParse(jobListSuccessResponseSchema, data);
        if (!result.success) {
          return err(
            createValidateJobsError(
              `Invalid job data. received: ${JSON.stringify(data, null, 2)}\n${result.issues.map((issue) => issue.message).join("\n")}`,
            ),
          );
        }
        return ok(result.output);
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
        const result = v.safeParse(jobFetchSuccessResponseSchema, data);
        if (!result.success) {
          return err(
            createValidateJobError(
              `Invalid job data. received: ${JSON.stringify(data, null, 2)}\n${result.issues.map((issue) => issue.message).join("\n")}`,
            ),
          );
        }
        return ok(result.output);
      })();
      return okAsync(validatedData);
    });
  },
};
