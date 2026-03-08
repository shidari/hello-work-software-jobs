import { Effect, Layer, Logger, LogLevel } from "effect";
import { PlaywrightBrowserConfig, PlaywrightChromiumBrowser } from "../browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../job-number-crawler/crawl";

async function main() {
  const program = Effect.gen(function* () {
    return yield* crawlJobLinks();
  }).pipe(
    Effect.provide(
      Layer.succeed(JobNumberCrawlerConfig, JobNumberCrawlerConfig.dev),
    ),
    Effect.provide(PlaywrightChromiumBrowser.Default),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(program).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
