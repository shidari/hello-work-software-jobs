import { ConfigProvider, Effect, Exit, Layer } from "effect";
import { PlaywrightBrowserConfig } from "../../lib/browser";
import { HelloWorkCrawler } from "../../lib/job-number-crawler/crawl";
import type { Env } from "../index";

export const handleScheduled = async (env: Env) => {
  const program = Effect.gen(function* () {
    const crawler = yield* HelloWorkCrawler;
    const jobs = yield* crawler.crawlJobLinks();
    yield* Effect.forEach(jobs, (job) =>
      Effect.tryPromise({
        try: () => env.JOB_DETAIL_QUEUE.send({ jobNumber: job.jobNumber }),
        catch: (e) => new Error(`Failed to send to queue: ${String(e)}`),
      }),
    );
    return jobs;
  }).pipe(
    Effect.provide(HelloWorkCrawler.Default),
    Effect.provide(PlaywrightBrowserConfig.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    console.log("handler succeeded", JSON.stringify(exit.value, null, 2));
    return exit.value;
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
