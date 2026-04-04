import type { AppType } from "@sho/api/types";
import type { Company } from "@sho/models";
import { Config, Context, Data, Effect, Layer } from "effect";
import { hc } from "hono/client";
import type { TransformedJob } from "./transformer";

// ── エラー ──

class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly reason: string;
  readonly error: unknown;
}> {}

class UpsertCompanyError extends Data.TaggedError("UpsertCompanyError")<{
  readonly reason: string;
  readonly error: unknown;
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

      const insertJob = (job: TransformedJob) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            `executing insert job api. jobNumber=${job.jobNumber}`,
          );
          const res = yield* Effect.orDieWith(
            Effect.tryPromise({
              try: () => client.jobs.$post({ json: { ...job } }),
              catch: (error) =>
                new InsertJobError({ reason: "fetch failed", error }),
            }),
            (e) =>
              new Error(
                `insertJob fetch failed: ${e.reason}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
              ),
          );
          if (!res.ok) {
            const text = yield* Effect.promise(() =>
              res.text().catch(() => "<unreadable>"),
            );
            return yield* Effect.die(
              new Error(`insertJob API responded with ${res.status}: ${text}`),
            );
          }
          yield* Effect.logDebug("insert job succeeded");
        });

      const upsertCompany = (company: Company) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            `executing upsert company api. establishmentNumber=${company.establishmentNumber}`,
          );
          const res = yield* Effect.orDieWith(
            Effect.tryPromise({
              try: () => client.companies.$post({ json: { ...company } }),
              catch: (error) =>
                new UpsertCompanyError({ reason: "fetch failed", error }),
            }),
            (e) =>
              new Error(
                `upsertCompany fetch failed: ${e.reason}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
              ),
          );
          if (!res.ok) {
            const text = yield* Effect.promise(() =>
              res.text().catch(() => "<unreadable>"),
            );
            return yield* Effect.die(
              new Error(
                `upsertCompany API responded with ${res.status}: ${text}`,
              ),
            );
          }
          yield* Effect.logDebug("upsert company succeeded");
        });

      return { insertJob, upsertCompany };
    }),
  },
) {}

// ── Loader サービス ──

export class JobDetailLoader extends Context.Tag("JobDetailLoader")<
  JobDetailLoader,
  {
    readonly load: (data: TransformedJob) => Effect.Effect<void>;
    readonly loadCompany: (company: Company) => Effect.Effect<void>;
  }
>() {
  static main = Layer.effect(
    JobDetailLoader,
    Effect.gen(function* () {
      const client = yield* JobStoreClient;
      return {
        load: (data: TransformedJob): Effect.Effect<void> =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading job detail...");
            yield* client.insertJob(data);
          }),
        loadCompany: (company: Company): Effect.Effect<void> =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading company...");
            yield* client.upsertCompany(company);
          }),
      };
    }),
  ).pipe(Layer.provide(JobStoreClient.Default));

  static noop = Layer.succeed(JobDetailLoader, {
    load: (_data) => Effect.logInfo("noop: skipping job detail load"),
    loadCompany: (_company) => Effect.logInfo("noop: skipping company load"),
  });
}
