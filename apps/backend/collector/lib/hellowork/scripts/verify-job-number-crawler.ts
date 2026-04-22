import { Console, Effect, Logger, LogLevel, Ref, Stream } from "effect";
import { ChromiumBrowserConfig, DebugDumpConfig } from "../browser";
import {
  CrawlerConfig,
  paginatedJobNumbers,
  SearchConfig,
} from "../job-number-crawler/crawl";

async function main() {
  const program = Effect.gen(function* () {
    const { untilCount } = yield* CrawlerConfig;
    const seenCountRef = yield* Ref.make(0);

    yield* paginatedJobNumbers().pipe(
      Stream.runForEachWhile((jobNumbers) =>
        Effect.gen(function* () {
          yield* Console.log(jobNumbers);
          const total = yield* Ref.updateAndGet(
            seenCountRef,
            (n) => n + jobNumbers.length,
          );
          return total <= untilCount;
        }),
      ),
    );
  }).pipe(Effect.scoped);

  const runnable = program.pipe(
    Effect.provide(CrawlerConfig.dev),
    Effect.provide(SearchConfig.simple),
    Effect.provide(ChromiumBrowserConfig.dev),
    Effect.provide(DebugDumpConfig.dev),
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  await Effect.runPromise(runnable);
}

main();
