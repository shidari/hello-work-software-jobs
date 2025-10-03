import type { transformedSchema } from "@sho/models";
import { Context, Effect, Layer } from "effect";
import type { InferOutput } from "valibot";
import { buildJobStoreClient } from "./helper";
import type { ConfigError } from "effect/ConfigError";
import type { InsertJobError } from "./error";

export class LoaderConfig extends Context.Tag("LoaderConfig")<
  LoaderConfig,
  {}
>() {}

export const loaderConfigLive = Layer.succeed(
  LoaderConfig,
  LoaderConfig.of({}),
);
export class JobDetailLoader extends Context.Tag("JobDetailLoader")<
  JobDetailLoader,
  {
    readonly load: (
      data: InferOutput<typeof transformedSchema>,
    ) => Effect.Effect<void, ConfigError | InsertJobError, LoaderConfig>;
  }
>() {}

export const loaderLive = Layer.effect(
  JobDetailLoader,
  Effect.gen(function* () {
    return JobDetailLoader.of({
      load: (data: InferOutput<typeof transformedSchema>) =>
        Effect.gen(function* () {
          const config = yield* LoaderConfig;
          yield* Effect.logInfo(
            `building loader: config=${JSON.stringify(config, null, 2)}`,
          );
          const client = yield* buildJobStoreClient();
          yield* client.insertJob(data);
          yield* Effect.logInfo(
            `start transforming... config=${JSON.stringify(config, null, 2)}`,
          );
        }),
    });
  }),
);
