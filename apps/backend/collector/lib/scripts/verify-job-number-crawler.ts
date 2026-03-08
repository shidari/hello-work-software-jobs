import { Effect, Layer, Logger, LogLevel } from "effect";
import {
  PlaywrightBrowserConfig,
  PlaywrightChromiumBrowseResource,
  PlaywrightChromiumContextResource,
  PlaywrightChromiumPageResource,
} from "../browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../job-number-crawler/crawl";

async function main() {
  const devLayer = Layer.mergeAll(
    Layer.succeed(JobNumberCrawlerConfig, JobNumberCrawlerConfig.dev),
    PlaywrightChromiumPageResource.DefaultWithoutDependencies,
  ).pipe(
    Layer.provide(PlaywrightChromiumContextResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumBrowseResource.Default),
    Layer.provide(PlaywrightBrowserConfig.dev),
  );
  const program = Effect.gen(function* () {
    return yield* crawlJobLinks();
  }).pipe(
    Effect.provide(devLayer),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(program).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
