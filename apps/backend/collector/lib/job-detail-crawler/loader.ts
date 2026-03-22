import type { AppType } from "@sho/api/types";
import type { Company } from "@sho/models";
import { Config, Data, Effect } from "effect";
import { hc } from "hono/client";
import type { TransformedJob } from "./transformer";

// ── エラー ──

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly reason: string;
  readonly error?: unknown;
}> {}

export class UpsertCompanyError extends Data.TaggedError("UpsertCompanyError")<{
  readonly reason: string;
  readonly error?: unknown;
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
          const res = yield* Effect.tryPromise({
            try: () => client.jobs.$post({ json: { ...job } }),
            catch: (error) =>
              new InsertJobError({ reason: "fetch failed", error }),
          });
          if (!res.ok) {
            const text = yield* Effect.tryPromise({
              try: () => res.text(),
              catch: () => "<unreadable>",
            });
            yield* new InsertJobError({
              reason: `API responded with ${res.status}: ${text}`,
            });
          }
          yield* Effect.logDebug("insert job succeeded");
        });

      const upsertCompany = (company: Company) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            `executing upsert company api. establishmentNumber=${company.establishmentNumber}`,
          );
          const res = yield* Effect.tryPromise({
            try: () => client.companies.$post({ json: { ...company } }),
            catch: (error) =>
              new UpsertCompanyError({ reason: "fetch failed", error }),
          });
          if (!res.ok) {
            const text = yield* Effect.tryPromise({
              try: () => res.text(),
              catch: () => "<unreadable>",
            });
            yield* new UpsertCompanyError({
              reason: `API responded with ${res.status}: ${text}`,
            });
          }
          yield* Effect.logDebug("upsert company succeeded");
        });

      return { insertJob, upsertCompany };
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
        loadCompany: (company: Company) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading company...");
            yield* client.upsertCompany(company);
          }),
      };
    }),
    dependencies: [JobStoreClient.Default],
  },
) {}
