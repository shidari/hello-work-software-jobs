import { readdir, rm } from "node:fs/promises";
import { Effect } from "effect";
import { ChromiumBrowserConfig } from "../../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";

export const handler = async () => {
  const jobs = await Effect.scoped(
    Effect.gen(function* () {
      const queue = yield* JobDetailQueue;
      const jobs = yield* crawlJobLinks();
      yield* Effect.forEach(jobs, (job) => queue.send(job));
      return jobs;
    }),
  )
    .pipe(
      Effect.provide(JobNumberCrawlerConfig.main),
      Effect.provide(ChromiumBrowserConfig.lambda),
      Effect.provide(JobDetailQueue.Default),
      Effect.orDie,
      Effect.runPromise,
    )
    .catch((error) => {
      console.error("crawler failed:", error);
      throw error;
    });

  console.log(`crawler success: ${jobs.length} jobs`);

  // Playwright が /tmp/playwright* にプロファイルを生成し browser.close() 後も残る。
  // Warm Start でコンテナ再利用時に蓄積し /tmp 容量枯渇 → newPage() クラッシュの原因になると判断。
  try {
    for (const entry of await readdir("/tmp")) {
      if (entry.startsWith("playwright")) {
        await rm(`/tmp/${entry}`, { recursive: true, force: true });
      }
    }
  } catch (e) {
    console.error("cleanup /tmp/playwright* failed", e);
  }

  return jobs;
};
