import type { JobNumber } from "@sho/models";
import { ConfigProvider, Effect, Exit, Layer } from "effect";
import { PlaywrightBrowserConfig } from "../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../lib/job-detail-crawler";
import type { Env } from "../index";

export const handleQueue = async (jobNumber: string, env: Env) => {
  const program = Effect.gen(function* () {
    yield* processJob(jobNumber as JobNumber);
  }).pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.Default),
    Effect.provide(PlaywrightBrowserConfig.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );
  const result = await Effect.runPromiseExit(program);

  if (Exit.isSuccess(result)) {
    console.log("Queue job succeeded:", result.value);
  } else {
    console.error("Queue job failed", result.cause);
    throw new Error(JSON.stringify(result.cause, null, 2));
  }
};
