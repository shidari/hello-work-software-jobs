import type { JobNumber } from "@sho/models";
import { Effect, Logger, LogLevel } from "effect";
import { PlaywrightBrowserConfig, PlaywrightChromiumBrowser } from "../browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../job-detail-crawler";

async function main() {
  const program = Effect.gen(function* () {
    const jobNumber = "01010-06778561" as JobNumber;
    yield* Effect.logInfo(`verifying job detail crawler for ${jobNumber}...`);
    return yield* processJob(jobNumber);
  }).pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.Default),
    Effect.provide(PlaywrightChromiumBrowser.Default),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(program).then((result) =>
    console.dir({ result }, { depth: null }),
  );
}

main();
