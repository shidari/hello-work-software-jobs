import { Effect, Layer, Logger, LogLevel } from "effect";
import {
  PlaywrightBrowserConfig,
  PlaywrightChromiumBrowseResource,
  PlaywrightChromiumContextResource,
  PlaywrightChromiumPageResource,
} from "../browser";
import {
  HelloWorkCrawler,
  JobNumberCrawlerConfig,
} from "../job-number-crawler/crawl";

async function main() {
  const devLayer = HelloWorkCrawler.DefaultWithoutDependencies.pipe(
    Layer.provide(
      Layer.succeed(JobNumberCrawlerConfig, JobNumberCrawlerConfig.dev),
    ),
    Layer.provide(PlaywrightChromiumPageResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumContextResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumBrowseResource.DefaultWithoutDependencies),
    Layer.provide(
      Layer.succeed(PlaywrightBrowserConfig, PlaywrightBrowserConfig.dev),
    ),
  );
  const program = Effect.gen(function* () {
    const crawler = yield* HelloWorkCrawler;
    return yield* crawler.crawlJobLinks();
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
