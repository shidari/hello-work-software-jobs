import type { AppType } from "@sho/api/types";
import type { Company } from "@sho/models";
import { Config, Context, Data, Effect, Layer } from "effect";
import { hc } from "hono/client";
import type { SystemError } from "../error";
import type { TransformedJob } from "./transformer";

// ── エラー ──

class InsertJobError extends Data.TaggedError("InsertJobError")<SystemError> {}

class UpsertCompanyError extends Data.TaggedError(
  "UpsertCompanyError",
)<SystemError> {}

class ApiResponseError extends Data.TaggedError("ApiResponseError")<{
  readonly reason: string;
  readonly operation: string;
  readonly status: number;
  readonly body: string;
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

      const upsertCompany = (company: Company) =>
        Effect.gen(function* () {
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

      return { insertJob, upsertCompany };
    }),
  },
) {}

// ── Loader サービス ──

export class JobDetailLoader extends Context.Tag("JobDetailLoader")<
  JobDetailLoader,
  {
    readonly load: (
      data: TransformedJob,
    ) => Effect.Effect<void, InsertJobError | ApiResponseError>;
    readonly loadCompany: (
      company: Company,
    ) => Effect.Effect<void, UpsertCompanyError | ApiResponseError>;
  }
>() {
  static main = Layer.effect(
    JobDetailLoader,
    Effect.gen(function* () {
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
  ).pipe(Layer.provide(JobStoreClient.Default));

  static noop = Layer.succeed(JobDetailLoader, {
    load: (_data) => Effect.logInfo("noop: skipping job detail load"),
    loadCompany: (_company) => Effect.logInfo("noop: skipping company load"),
  });
}
