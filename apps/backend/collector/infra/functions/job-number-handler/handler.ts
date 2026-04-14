import { readdir, rm } from "node:fs/promises";
import { Effect } from "effect";
import { ChromiumBrowserConfig } from "../../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";
import { LoggerLayer, logErrorCause } from "../logger";
import { logTmpUsage } from "../tmp-usage";

// Playwright が /tmp/playwright* にプロファイルを生成し browser.close() 後も残る。
// Warm Start でコンテナ再利用時に蓄積し /tmp 容量枯渇 → newPage() クラッシュの原因になると判断。
const cleanupTmp = Effect.tryPromise({
  try: async () => {
    for (const entry of await readdir("/tmp")) {
      if (entry.startsWith("playwright")) {
        await rm(`/tmp/${entry}`, { recursive: true, force: true });
      }
    }
  },
  catch: (e) => e,
}).pipe(
  Effect.catchAll((e) =>
    Effect.logError("cleanup /tmp/playwright* failed").pipe(
      Effect.annotateLogs({ error: { message: String(e) } }),
    ),
  ),
);

const program = Effect.gen(function* () {
  yield* Effect.promise(() => logTmpUsage("job-number-crawler:start"));

  const queue = yield* JobDetailQueue;
  const jobs = yield* crawlJobLinks();
  yield* Effect.forEach(jobs, (job) => queue.send(job));

  yield* Effect.logInfo("job number crawler success").pipe(
    Effect.annotateLogs({ jobCount: jobs.length }),
  );

  yield* cleanupTmp;
  return jobs;
}).pipe(
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
