import { Effect, LogLevel, Logger } from "effect";
import scraperConfig from "../config/scraper";
import { validateJobNumber } from "../core/page/JobDetail/validators";
import {
  buildHelloWorkRawJobDetailHtmlExtractorLayer,
  HelloWorkRawJobDetailHtmlExtractor,
} from "./context";
export function extractJobDetailRawHtml(rawJobNumber: string) {
  return Effect.gen(function* () {
    const config = yield* Effect.promise(() => scraperConfig);
    const layer = buildHelloWorkRawJobDetailHtmlExtractorLayer(config);
    const program = Effect.gen(function* () {
      const jobNumber = yield* validateJobNumber(rawJobNumber);
      const extractor = yield* HelloWorkRawJobDetailHtmlExtractor;
      const rawHtml = yield* extractor.extractRawHtml(jobNumber);
      return rawHtml;
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
