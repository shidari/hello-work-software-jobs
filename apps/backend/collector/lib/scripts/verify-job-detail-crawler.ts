import { JobNumber } from "@sho/models";
import { Effect, Logger, LogLevel, Schema } from "effect";
import { PlaywrightBrowserConfig, PlaywrightChromium } from "../browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../job-detail-crawler";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: pnpm dev:verify-job-detail-crawler <jobNumber>");
    process.exit(1);
  }
  const jobNumber = Schema.decodeUnknownSync(JobNumber)(arg);

  const program = Effect.gen(function* () {
    yield* Effect.logInfo(`verifying job detail crawler for ${jobNumber}...`);
    return yield* processJob(jobNumber);
  });

  const runnable = program.pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.Default),
    Effect.provide(PlaywrightChromium.DefaultWithoutDependencies),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  Effect.runPromise(runnable).then((result) =>
    console.dir({ result }, { depth: null }),
  );
}

main();
