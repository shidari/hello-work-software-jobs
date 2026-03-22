import { Cause, Effect, Exit } from "effect";
import { PlaywrightBrowserConfig } from "../../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";

export const handler = async () => {
  const startedAt = new Date().toISOString();

  const program = Effect.scoped(
    Effect.gen(function* () {
      const queue = yield* JobDetailQueue;
      const jobs = yield* crawlJobLinks();
      yield* Effect.forEach(jobs, (job) => queue.send(job));
      return jobs;
    }),
  );

  const runnable = program.pipe(
    Effect.provide(JobNumberCrawlerConfig.main),
    Effect.provide(PlaywrightBrowserConfig.main),
    Effect.provide(JobDetailQueue.Default),
  );
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const jobs = exit.value;
    console.log(
      JSON.stringify({
        event: "crawler_run",
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
        fetchedCount: jobs.length,
        queuedCount: jobs.length,
      }),
    );
    return jobs;
  }

  for (const failure of Cause.failures(exit.cause)) {
    if ("error" in failure && failure.error) console.error(failure.error);
  }
  const errorMessage = Cause.pretty(exit.cause);
  console.error(
    JSON.stringify({
      event: "crawler_run",
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      errorMessage,
    }),
  );
  throw new Error(`handler failed: ${errorMessage}`);
};
