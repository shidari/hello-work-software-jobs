import { jobListSuccessResponseSchema, type SearchFilter } from "@sho/models";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import * as v from "valibot";
import {
  createEndPointNotFoundError,
  createFetchJobsError,
  createParseJsonError,
  createValidateJobsError,
  type JobStoreClient,
} from "../type";

const j = Symbol();
type JobEndPoint = { [j]: unknown } & string;
export const jobStoreClientOnServer: JobStoreClient = {
  getInitialJobs(filter: SearchFilter = {}) {
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

      const searchParams = new URLSearchParams();
      if (filter.companyName) {
        searchParams.append(
          "companyName",
          encodeURIComponent(filter.companyName),
        );
      }
      if (filter.employeeCountGt) {
        searchParams.append("employeeCountGt", String(filter.employeeCountGt));
      }
      if (filter.employeeCountLt) {
        searchParams.append("employeeCountLt", String(filter.employeeCountLt));
      }

      if (filter.jobDescription) {
        searchParams.append("jobDescription", filter.jobDescription);
      }

      if (filter.jobDescriptionExclude) {
        searchParams.append(
          "jobDescriptionExclude",
          filter.jobDescriptionExclude,
        );
      }

      searchParams.append("orderByReceiveDate", "desc");
      const url = `${endpoint}/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      const response = yield* ResultAsync.fromPromise(fetch(url), () =>
        createFetchJobsError("Failed to fetch jobs"),
      );
      const data = yield* ResultAsync.fromPromise(response.json(), (error) =>
        createParseJsonError(`Failed to parse jobs response: ${String(error)}`),
      );

      const validatedData = yield* (() => {
        const result = v.safeParse(jobListSuccessResponseSchema, data);
        if (!result.success) {
          return err(
            createValidateJobsError(`Invalid job data: ${result.issues}`),
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

      const validatedData = yield* (() => {
        const result = v.safeParse(jobListSuccessResponseSchema, data);
        if (!result.success) {
          return err(
            createValidateJobsError(`Invalid job data: ${result.issues}`),
          );
        }
        return ok(result.output);
      })();
      return okAsync(validatedData);
    });
  },
};
