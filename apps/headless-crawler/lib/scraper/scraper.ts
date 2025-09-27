import { Effect, LogLevel, Logger } from "effect";
import scraperConfig from "../config/scraper";
import { validateJobNumber } from "../core/validation";
import { HelloWorkScraper, buildHelloWorkScrapingLayer } from "./context";
export function buildScrapingResult(rawJobNumber: string) {
  return Effect.gen(function* () {
    const config = yield* Effect.promise(() => scraperConfig);
    const layer = buildHelloWorkScrapingLayer(config);

    const program = Effect.gen(function* () {
      const jobNumber = yield* validateJobNumber(rawJobNumber);
      const scraper = yield* HelloWorkScraper;
      const jobInfo = yield* scraper.scrapeJobData(jobNumber);
      return jobInfo;
    });
    return yield* Effect.provide(program, layer)
      .pipe(Effect.scoped)
      .pipe(
        Logger.withMinimumLogLevel(
          config.debugLog ? LogLevel.Debug : LogLevel.Info,
        ),
      );
  });
}
