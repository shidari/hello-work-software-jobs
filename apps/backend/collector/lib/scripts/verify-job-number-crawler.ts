import { Console, Effect, Logger, LogLevel, Stream } from "effect";
import { APIConfig } from "../apiClient/config";
import { ChromiumBrowserConfig } from "../browser";
import {
  JobNumberCrawlerConfig,
  paginatedJobNumbers,
} from "../job-number-crawler/crawl";

async function main() {
  const program = paginatedJobNumbers().pipe(
    Stream.runForEach((unregistered) => Console.log(unregistered)),
    Effect.scoped,
  );

  const runnable = program.pipe(
    Effect.provide(APIConfig.main),
    Effect.provide(JobNumberCrawlerConfig.dev),
    Effect.provide(ChromiumBrowserConfig.dev),
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  await Effect.runPromise(runnable);
}

main();
