import type { JobNumber } from "../schemas";
import { Effect, Layer, Logger, LogLevel } from "effect";
import {
  PlaywrightBrowserConfig,
  PlaywrightChromiumBrowseResource,
  PlaywrightChromiumContextResource,
  PlaywrightChromiumPageResource,
} from "../browser";
import {
  JobDetailExtractor,
  JobDetailTransformer,
} from "../job-detail-crawler/crawl";
import { FirstJobListPageNavigator, JobSearchPageService } from "../page";

async function main() {
  const devLayer = Layer.mergeAll(
    JobDetailExtractor.DefaultWithoutDependencies,
    JobDetailTransformer.Default,
  ).pipe(
    Layer.provide(FirstJobListPageNavigator.DefaultWithoutDependencies),
    Layer.provide(JobSearchPageService.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumPageResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumContextResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumBrowseResource.DefaultWithoutDependencies),
    Layer.provide(
      Layer.succeed(PlaywrightBrowserConfig, PlaywrightBrowserConfig.dev),
    ),
  );
  const program = Effect.gen(function* () {
    const extractor = yield* JobDetailExtractor;
    const transformer = yield* JobDetailTransformer;
    const jobNumber = "01010-06778561" as JobNumber;
    yield* Effect.logInfo(`verifying job detail crawler for ${jobNumber}...`);
    const { rawHtml } = yield* extractor.extractRawHtml(jobNumber);
    const transformed = yield* transformer.transform(rawHtml);
    return transformed;
  }).pipe(
    Effect.provide(devLayer),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(program).then((result) =>
    console.dir({ result }, { depth: null }),
  );
}

main();
