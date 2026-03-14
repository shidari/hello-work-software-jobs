import type { Company } from "@sho/models";
import { Config, Data, Effect } from "effect";
import type { TransformedJob } from "./transformer";

// ── エラー ──

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly reason: string;
  readonly serializedPayload: string;
  readonly responseStatus?: number;
  readonly responseStatusMessage?: string;
}> {}

export class UpsertCompanyError extends Data.TaggedError(
  "UpsertCompanyError",
)<{
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

      const postJson = (
        path: string,
        body: unknown,
        errorClass: typeof InsertJobError | typeof UpsertCompanyError,
      ) =>
        Effect.gen(function* () {
          const serialized = JSON.stringify(body, null, 2);
          const res = yield* Effect.tryPromise({
            try: async () =>
              fetch(`${endpoint}${path}`, {
                method: "POST",
                body: JSON.stringify(body),
                headers: {
                  "content-type": "application/json",
                  "x-api-key": apiKey,
                },
              }),
            catch: (e) =>
              new errorClass({
                reason: `${e instanceof Error ? e.message : String(e)}`,
                serializedPayload: serialized,
              }),
          });
          if (!res.ok) {
            const text = yield* Effect.tryPromise({
              try: () => res.text(),
              catch: () => "<unreadable>",
            });
            yield* new errorClass({
              reason: `API responded with ${res.status}: ${text}`,
              serializedPayload: serialized,
              responseStatus: res.status,
              responseStatusMessage: res.statusText,
            });
          }
          const data = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (e) =>
              new errorClass({
                reason: `${e instanceof Error ? e.message : String(e)}`,
                serializedPayload: serialized,
                responseStatus: res.status,
                responseStatusMessage: res.statusText,
              }),
          });
          yield* Effect.logDebug(
            `response data. ${JSON.stringify(data, null, 2)}`,
          );
        });

      return {
        insertJob: (job: TransformedJob) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(
              `executing insert job api. jobNumber=${job.jobNumber}`,
            );
            yield* postJson("/jobs", job, InsertJobError);
          }),
        upsertCompany: (company: Company) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(
              `executing upsert company api. establishmentNumber=${company.establishmentNumber}`,
            );
            yield* postJson("/companies", company, UpsertCompanyError);
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
