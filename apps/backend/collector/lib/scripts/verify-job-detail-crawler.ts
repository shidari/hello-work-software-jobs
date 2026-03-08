import type { JobNumber } from "@sho/models";
import { Effect, Layer, Logger, LogLevel } from "effect";
import {
  PlaywrightBrowserConfig,
  PlaywrightChromiumBrowseResource,
  PlaywrightChromiumContextResource,
  PlaywrightChromiumPageResource,
} from "../browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../job-detail-crawler";

async function main() {
  const devLayer = Layer.mergeAll(
    JobDetailExtractor.DefaultWithoutDependencies,
    JobDetailTransformer.Default,
    JobDetailLoader.Default,
  ).pipe(
    Layer.provide(PlaywrightChromiumPageResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumContextResource.DefaultWithoutDependencies),
    Layer.provide(PlaywrightChromiumBrowseResource.Default),
    Layer.provide(PlaywrightBrowserConfig.dev),
  );
  const program = Effect.gen(function* () {
    const jobNumber = "01010-06778561" as JobNumber;
    yield* Effect.logInfo(`verifying job detail crawler for ${jobNumber}...`);
    return yield* processJob(jobNumber);
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
