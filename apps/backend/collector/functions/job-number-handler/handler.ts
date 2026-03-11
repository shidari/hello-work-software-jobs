import { Cause, Effect, Exit, Layer } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../lib/job-number-crawler/crawl";
import type { SearchPeriod } from "../../lib/job-number-crawler/type";
import { PubSubConfig, publishJobDetail } from "../../lib/pubsub";

export const handleScheduled = async (
  trigger: "cron" | "manual" = "cron",
  searchPeriod: SearchPeriod = "today",
  maxCount?: number,
) => {
  const startedAt = new Date().toISOString();

  const program = Effect.gen(function* () {
    const jobs = yield* crawlJobLinks();
    yield* Effect.forEach(jobs, (job) => publishJobDetail(job));
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
    Effect.provide(PlaywrightChromium.Default),
    Effect.provide(PubSubConfig.Default),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const jobs = exit.value;
    console.log(
      JSON.stringify({
        type: "crawler_run",
        status: "success",
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        fetchedCount: jobs.length,
        queuedCount: jobs.length,
        failedCount: 0,
      }),
    );
    return jobs;
  }

  const errorMessage = Cause.pretty(exit.cause);
  console.error(
    JSON.stringify({
      type: "crawler_run",
      status: "failed",
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      fetchedCount: 0,
      queuedCount: 0,
      failedCount: 0,
      errorMessage,
    }),
  );
  throw new Error(`handler failed: ${errorMessage}`);
};
