import type { AppType } from "@sho/api/types";
import type { Company } from "@sho/models";
import { Data, Effect } from "effect";
import { hc } from "hono/client";
import type { SystemError } from "../error";
import type { TransformedJob } from "../job-detail-crawler/transformer";
import { APIConfig } from "./config";

export class InsertJobError extends Data.TaggedError(
  "InsertJobError",
)<SystemError> {}

export class UpsertCompanyError extends Data.TaggedError(
  "UpsertCompanyError",
)<SystemError> {}

export class ApiResponseError extends Data.TaggedError("ApiResponseError")<{
  readonly reason: string;
  readonly operation: string;
  readonly status: number;
  readonly body: string;
}> {}

export const insertJob = Effect.fn("insertJob")(function* (
  job: TransformedJob,
) {
  const { endpoint, apiKey } = yield* APIConfig;
  const client = hc<AppType>(endpoint, { headers: { "x-api-key": apiKey } });
  yield* Effect.logDebug(
    `executing insert job api. jobNumber=${job.jobNumber}`,
  );
  const res = yield* Effect.tryPromise({
    try: () => client.jobs.$post({ json: { ...job } }),
    catch: (e) =>
      new InsertJobError({
        reason: "insertJob fetch failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  if (!res.ok) {
    const text = yield* Effect.promise(() =>
      res.text().catch(() => "<unreadable>"),
    );
    return yield* Effect.fail(
      new ApiResponseError({
        reason: `insertJob API responded with ${res.status}`,
        operation: "insertJob",
        status: res.status,
        body: text,
      }),
    );
  }
  yield* Effect.logDebug("insert job succeeded");
});

export const upsertCompany = Effect.fn("upsertCompany")(function* (
  company: Company,
) {
  const { endpoint, apiKey } = yield* APIConfig;
  const client = hc<AppType>(endpoint, { headers: { "x-api-key": apiKey } });
  yield* Effect.logDebug(
    `executing upsert company api. establishmentNumber=${company.establishmentNumber}`,
  );
  const res = yield* Effect.tryPromise({
    try: () => client.companies.$post({ json: { ...company } }),
    catch: (e) =>
      new UpsertCompanyError({
        reason: "upsertCompany fetch failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  if (!res.ok) {
    const text = yield* Effect.promise(() =>
      res.text().catch(() => "<unreadable>"),
    );
    return yield* Effect.fail(
      new ApiResponseError({
        reason: `upsertCompany API responded with ${res.status}`,
        operation: "upsertCompany",
        status: res.status,
        body: text,
      }),
    );
  }
  yield* Effect.logDebug("upsert company succeeded");
});
