import { ConfigProvider, Effect, Exit, Layer } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  finishCrawlerRun,
  startCrawlerRun,
} from "../../lib/crawler-run-logger";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../lib/job-number-crawler/crawl";
import type { Env } from "../index";

export const handleScheduled = async (
  env: Env,
  trigger: "cron" | "manual" = "cron",
) => {
  let runId: number | null = null;
  try {
    runId = await startCrawlerRun(env, trigger);
  } catch (e) {
    console.error("Failed to start crawler run log", e);
  }

  const program = Effect.gen(function* () {
    const jobs = yield* crawlJobLinks();
    yield* Effect.forEach(jobs, (job) =>
      Effect.tryPromise({
        try: () => env.JOB_DETAIL_QUEUE.send({ jobNumber: job.jobNumber }),
        catch: (e) => new Error(`Failed to send to queue: ${String(e)}`),
      }),
    );
    return jobs;
  });

  const runnable = program.pipe(
    Effect.provide(JobNumberCrawlerConfig.Default),
    Effect.provide(PlaywrightChromium.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const jobs = exit.value;
    console.log("handler succeeded", JSON.stringify(jobs, null, 2));
    if (runId != null) {
      try {
        await finishCrawlerRun(env, runId, {
          status: "success",
          fetchedCount: jobs.length,
          queuedCount: jobs.length,
        });
      } catch (e) {
        console.error("Failed to finish crawler run log", e);
      }
    }
    return jobs;
  }

  if (runId != null) {
    try {
      await finishCrawlerRun(env, runId, {
        status: "failed",
        errorMessage: String(exit.cause),
      });
    } catch (e) {
      console.error("Failed to finish crawler run log", e);
    }
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
