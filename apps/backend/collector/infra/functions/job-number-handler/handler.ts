import { Effect } from "effect";
import { ChromiumBrowserConfig } from "../../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";
import { LoggerLayer, logErrorCause } from "../logger";
import { cleanupTmp, disableCoreDump, logTmpUsage } from "../tmp-usage";

const program = Effect.gen(function* () {
  yield* disableCoreDump;
  yield* cleanupTmp;
  yield* Effect.promise(() => logTmpUsage("job-number-crawler:start"));

  const queue = yield* JobDetailQueue;
  const jobs = yield* crawlJobLinks();
  yield* Effect.forEach(jobs, (job) => queue.send(job));

  yield* Effect.logInfo("job number crawler success").pipe(
    Effect.annotateLogs({ jobCount: jobs.length }),
  );

  return jobs;
}).pipe(
  Effect.ensuring(cleanupTmp),
  Effect.tapErrorCause((cause) =>
    logErrorCause("job number crawler failed", cause),
  ),
  Effect.scoped,
  Effect.provide(JobNumberCrawlerConfig.main),
  Effect.provide(ChromiumBrowserConfig.lambda),
  Effect.provide(JobDetailQueue.Default),
  Effect.provide(LoggerLayer),
  Effect.orDie,
);

export const handler = async () => Effect.runPromise(program);
