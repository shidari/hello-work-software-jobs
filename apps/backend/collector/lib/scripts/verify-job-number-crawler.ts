import { Effect, Layer, Logger, LogLevel } from "effect";
import { PlaywrightBrowserConfig, PlaywrightChromium } from "../browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../job-number-crawler/crawl";

async function main() {
  const program = Effect.gen(function* () {
    return yield* crawlJobLinks();
  });

  const runnable = program.pipe(
    Effect.provide(
      Layer.succeed(JobNumberCrawlerConfig, JobNumberCrawlerConfig.dev),
    ),
    Effect.provide(PlaywrightChromium.Default),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(runnable).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
