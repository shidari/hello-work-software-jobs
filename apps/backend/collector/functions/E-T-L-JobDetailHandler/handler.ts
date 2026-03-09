import { createD1DB } from "@sho/db";
import { JobNumber } from "@sho/models";
import { ConfigProvider, Effect, Layer, Schema } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../lib/job-detail-crawler";
import type { Env } from "../index";

export const handleQueue = async (jobNumber: string, env: Env) => {
  const db = createD1DB(env.DB);
  const startedAt = new Date().toISOString();

  const program = Effect.gen(function* () {
    const parsed = yield* Schema.decodeEither(JobNumber)(jobNumber);
    yield* processJob(parsed);
  });

  const runnable = program.pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.Default),
    Effect.provide(PlaywrightChromium.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );

  await runnable.pipe(
    Effect.matchEffect({
      onSuccess: () =>
        Effect.tryPromise(() =>
          db
            .insertInto("job_detail_runs")
            .values({
              jobNumber,
              status: "success",
              startedAt,
              finishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            })
            .execute(),
        ).pipe(Effect.ignore),
      onFailure: (error) => {
        const errorMessage =
          typeof error === "string"
            ? error
            : `${error._tag}: ${"reason" in error ? error.reason : error.message}`;
        return Effect.tryPromise(() =>
          db
            .insertInto("job_detail_runs")
            .values({
              jobNumber,
              status: "failed",
              startedAt,
              finishedAt: new Date().toISOString(),
              errorMessage,
              createdAt: new Date().toISOString(),
            })
            .execute(),
        ).pipe(
          Effect.tapError((e) =>
            Effect.logError("Failed to log job_detail_run", e),
          ),
          Effect.ignore,
        );
      },
    }),
    Effect.runPromise,
  );
};
