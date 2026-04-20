import type { AppType } from "@sho/api/types";
import type { JobNumber } from "@sho/models";
import { Data, Effect } from "effect";
import { hc } from "hono/client";
import type { SystemError } from "../error";
import { APIConfig } from "./config";

class JobStoreExistsError extends Data.TaggedError(
  "JobStoreExistsError",
)<SystemError> {}

class JobStoreExistsResponseError extends Data.TaggedError(
  "JobStoreExistsResponseError",
)<{
  readonly reason: string;
  readonly status: number;
  readonly body: string;
}> {}

export const filterUnregistered = Effect.fn("filterUnregistered")(function* (
  jobNumbers: readonly JobNumber[],
) {
  if (jobNumbers.length === 0) return jobNumbers;
  const { endpoint, apiKey } = yield* APIConfig;
  const client = hc<AppType>(endpoint, { headers: { "x-api-key": apiKey } });
  const res = yield* Effect.tryPromise({
    try: () =>
      client.jobs.exists.$post({
        json: { jobNumbers: [...jobNumbers] },
      }),
    catch: (e) =>
      new JobStoreExistsError({
        reason: "filterUnregistered fetch failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  if (!res.ok) {
    const text = yield* Effect.promise(() =>
      res.text().catch(() => "<unreadable>"),
    );
    return yield* Effect.fail(
      new JobStoreExistsResponseError({
        reason: `jobs/exists API responded with ${res.status}`,
        status: res.status,
        body: text,
      }),
    );
  }
  const body = yield* Effect.promise(() => res.json());
  const unregistered = [
    ...new Set(jobNumbers).difference(new Set(body.existing)),
  ];
  yield* Effect.logInfo("filtered existing job numbers").pipe(
    Effect.annotateLogs({
      total: jobNumbers.length,
      existing: body.existing.length,
      unregistered: unregistered.length,
    }),
  );
  return unregistered;
});
