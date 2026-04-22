import { Effect, Ref, Stream } from "effect";
import { APIConfig } from "../../../lib/apiClient/config";
import { filterUnregistered } from "../../../lib/apiClient/query";
import { ChromiumBrowserConfig, DebugDumpConfig } from "../../../lib/hellowork/browser";
import {
  CrawlerConfig,
  paginatedJobNumbers,
  SearchConfig,
} from "../../../lib/hellowork/job-number-crawler/crawl";
import { JobDetailQueueConfig, sendJobDetail } from "../../sqs";
import { LoggerLayer, logErrorCause } from "../logger";
import { cleanupTmp, disableCoreDump, logTmpUsage } from "../tmp-usage";

const program = Effect.gen(function* () {
  yield* disableCoreDump;
  yield* cleanupTmp;
  yield* Effect.promise(() => logTmpUsage("job-number-crawler:start"));

  const { untilCount } = yield* CrawlerConfig;
  const enqueuedCountRef = yield* Ref.make(0);

  yield* paginatedJobNumbers().pipe(
    Stream.runForEachWhile((jobNumbers) =>
      Effect.gen(function* () {
        const unregistered = yield* filterUnregistered(jobNumbers);
        yield* Effect.forEach(unregistered, (jobNumber) =>
          sendJobDetail({ jobNumber }),
        );
        const total = yield* Ref.updateAndGet(
          enqueuedCountRef,
          (n) => n + unregistered.length,
        );
        return total <= untilCount;
      }),
    ),
  );

  const enqueuedCount = yield* Ref.get(enqueuedCountRef);
  yield* Effect.logInfo("job number crawler success").pipe(
    Effect.annotateLogs({ enqueuedCount }),
  );

  return enqueuedCount;
}).pipe(
  Effect.ensuring(cleanupTmp),
  Effect.tapErrorCause((cause) =>
    logErrorCause("job number crawler failed", cause),
  ),
  Effect.scoped,
);

const runnable = program.pipe(
  Effect.provide(APIConfig.main),
  Effect.provide(CrawlerConfig.main),
  Effect.provide(SearchConfig.detailed),
  Effect.provide(ChromiumBrowserConfig.lambda),
  Effect.provide(DebugDumpConfig.noop),
  Effect.provide(JobDetailQueueConfig.main),
  Effect.provide(LoggerLayer),
  Effect.orDie,
);

export const handler = async () => Effect.runPromise(runnable);
