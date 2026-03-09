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
    // 一次対処: DBログの失敗でパイプラインを止めないため、tryPromiseではなくpromiseを使用
    Effect.matchEffect({
      onSuccess: () =>
        Effect.promise(() =>
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
        ),
      onFailure: (error) =>
        Effect.promise(() =>
          db
            .insertInto("job_detail_runs")
            .values({
              jobNumber,
              status: "failed",
              startedAt,
              finishedAt: new Date().toISOString(),
              errorMessage: String(error),
              createdAt: new Date().toISOString(),
            })
            .execute(),
        ),
    }),
    Effect.runPromise,
  );
};
