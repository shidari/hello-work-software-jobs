import type { AppType } from "@sho/api/types";
import { Config, Data, Effect } from "effect";
import { hc } from "hono/client";
import type { TransformedJob } from "./transformer";

// ── エラー ──

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly reason: string;
  readonly serializedPayload: string;
  readonly responseStatus?: number;
  readonly responseStatusMessage?: string;
}> {}

// ── JobStore API クライアント ──

export class JobStoreClient extends Effect.Service<JobStoreClient>()(
  "JobStoreClient",
  {
    effect: Effect.gen(function* () {
      const endpoint = yield* Config.string("JOB_STORE_ENDPOINT");
      const apiKey = yield* Config.string("API_KEY");
      const client = hc<AppType>(endpoint, {
        headers: { "x-api-key": apiKey },
      });
      return {
        insertJob: (job: TransformedJob) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(
              `executing insert job api. job=${JSON.stringify(job, null, 2)}`,
            );
            const res = yield* Effect.tryPromise({
              try: () => client.jobs.$post({ json: job }),
              catch: (e) =>
                new InsertJobError({
                  reason: `${e instanceof Error ? e.message : String(e)}`,
                  serializedPayload: JSON.stringify(job, null, 2),
                }),
            });
            if (!res.ok) {
              const body = yield* Effect.tryPromise({
                try: () => res.text(),
                catch: () => "<unreadable>",
              });
              yield* new InsertJobError({
                reason: `API responded with ${res.status}: ${body}`,
                serializedPayload: JSON.stringify(job, null, 2),
                responseStatus: res.status,
                responseStatusMessage: res.statusText,
              });
            }
            yield* Effect.logDebug(
              `insert job succeeded. status=${res.status}`,
            );
          }),
      };
    }),
  },
) {}

// ── Loader サービス ──

export class JobDetailLoader extends Effect.Service<JobDetailLoader>()(
  "JobDetailLoader",
  {
    effect: Effect.gen(function* () {
      const client = yield* JobStoreClient;
      return {
        load: (data: TransformedJob) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading job detail...");
            yield* client.insertJob(data);
          }),
      };
    }),
    dependencies: [JobStoreClient.Default],
  },
) {}
