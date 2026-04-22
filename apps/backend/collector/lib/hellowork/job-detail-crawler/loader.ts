import type { Company } from "@sho/models";
import { Context, Effect, Layer } from "effect";
import { APIConfig } from "../../apiClient/config";
import type {
  ApiResponseError,
  InsertJobError,
  UpsertCompanyError,
} from "../../apiClient/mutation";
import { insertJob, upsertCompany } from "../../apiClient/mutation";
import type { TransformedJob } from "./transformer";

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
      const config = yield* APIConfig;
      return {
        load: (data: TransformedJob) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading job detail...");
            yield* insertJob(data);
          }).pipe(Effect.provideService(APIConfig, config)),
        loadCompany: (company: Company) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading company...");
            yield* upsertCompany(company);
          }).pipe(Effect.provideService(APIConfig, config)),
      };
    }),
  ).pipe(Layer.provide(APIConfig.main));

  static noop = Layer.succeed(JobDetailLoader, {
    load: (_data) => Effect.logInfo("noop: skipping job detail load"),
    loadCompany: (_company) => Effect.logInfo("noop: skipping company load"),
  });
}
