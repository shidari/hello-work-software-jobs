import { Effect, Logger, LogLevel } from "effect";
import { PlaywrightBrowserConfig } from "../browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../job-number-crawler/crawl";

async function main() {
  const program = Effect.gen(function* () {
    return yield* crawlJobLinks();
  });

  const runnable = program.pipe(
    Effect.provide(JobNumberCrawlerConfig.dev),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(runnable).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
