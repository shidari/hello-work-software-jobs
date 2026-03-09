import { createD1DB } from "@sho/db";
import { Cause, ConfigProvider, Effect, Exit, Layer } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../lib/job-number-crawler/crawl";
import type { SearchPeriod } from "../../lib/job-number-crawler/type";
import type { Env } from "../index";

export const handleScheduled = async (
  env: Env,
  trigger: "cron" | "manual" = "cron",
  searchPeriod: SearchPeriod = "today",
  maxCount?: number,
) => {
  const db = createD1DB(env.DB);
  const startedAt = new Date().toISOString();

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

  const crawlerConfigLayer = Layer.effect(
    JobNumberCrawlerConfig,
    Effect.gen(function* () {
      const base = yield* JobNumberCrawlerConfig;
      return new JobNumberCrawlerConfig({
        config: {
          ...base.config,
          ...(maxCount != null ? { roughMaxCount: maxCount } : {}),
          jobSearchCriteria: {
            ...base.config.jobSearchCriteria,
            searchPeriod,
          },
        },
      });
    }).pipe(Effect.provide(JobNumberCrawlerConfig.Default)),
  );

  const runnable = program.pipe(
    Effect.provide(crawlerConfigLayer),
    Effect.provide(PlaywrightChromium.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const jobs = exit.value;
    console.log("handler succeeded", JSON.stringify(jobs, null, 2));
    try {
      await db
        .insertInto("crawler_runs")
        .values({
          status: "success",
          trigger,
          startedAt,
          finishedAt: new Date().toISOString(),
          fetchedCount: jobs.length,
          queuedCount: jobs.length,
          failedCount: 0,
          createdAt: new Date().toISOString(),
        })
        .execute();
    } catch (e) {
      console.error("Failed to log crawler run", e);
    }
    return jobs;
  }

  const errorMessage = Cause.pretty(exit.cause);
  try {
    await db
      .insertInto("crawler_runs")
      .values({
        status: "failed",
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        fetchedCount: 0,
        queuedCount: 0,
        failedCount: 0,
        errorMessage,
        createdAt: new Date().toISOString(),
      })
      .execute();
  } catch (e) {
    console.error("Failed to log crawler run", e);
  }
  throw new Error(`handler failed: ${errorMessage}`);
};
