import { Config, Data, Effect } from "effect";
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
      return {
        insertJob: (job: TransformedJob) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(
              `executing insert job api. job=${JSON.stringify(job, null, 2)}`,
            );
            const res = yield* Effect.tryPromise({
              try: async () =>
                fetch(`${endpoint}/jobs`, {
                  method: "POST",
                  body: JSON.stringify(job),
                  headers: {
                    "content-type": "application/json",
                    "x-api-key": apiKey,
                  },
                }),
              catch: (e) =>
                new InsertJobError({
                  reason: `${e instanceof Error ? e.message : String(e)}`,
                  serializedPayload: JSON.stringify(job, null, 2),
                }),
            });
            const data = yield* Effect.tryPromise({
              try: () => res.json(),
              catch: (e) =>
                new InsertJobError({
                  reason: `${e instanceof Error ? e.message : String(e)}`,
                  serializedPayload: JSON.stringify(job, null, 2),
                  responseStatus: res.status,
                  responseStatusMessage: res.statusText,
                }),
            });
            yield* Effect.logDebug(
              `response data. ${JSON.stringify(data, null, 2)}`,
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
