import { Effect, Logger, LogLevel } from "effect";
import type { JobNumber } from "@sho/models";
import { Extractor } from "..";
import { PlaywrightBrowserConfig, PlaywrightChromiumBrowseResource } from "../../../core/headless-browser";

async function main() {
  const jobNumber = "01010-46772851" as JobNumber;
  const program = Effect.gen(function* () {
    const extractor = yield* Extractor
    const jobInfo = yield* extractor.extractRawHtml(jobNumber);
    return jobInfo;
  })
  const runnable = program
    .pipe(Effect.provide(
      Extractor.Default
    ))
    .pipe(Effect.provide(PlaywrightChromiumBrowseResource.DefaultWithoutDependencies))
    .pipe(Effect.provideService(PlaywrightBrowserConfig, PlaywrightBrowserConfig.dev))
    .pipe(Effect.scoped)
    .pipe(Logger.withMinimumLogLevel(LogLevel.Debug))
  Effect.runPromise(runnable).then((jobInfo) =>
    console.dir({ ...jobInfo }, { depth: null }),
  );
}
main();
