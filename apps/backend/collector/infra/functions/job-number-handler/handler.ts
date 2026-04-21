import { Effect, Ref, Stream } from "effect";
import { APIConfig } from "../../../lib/apiClient/config";
import { filterUnregistered } from "../../../lib/apiClient/query";
import { ChromiumBrowserConfig } from "../../../lib/browser";
import {
  JobNumberCrawlerConfig,
  paginatedJobNumbers,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";
import { LoggerLayer, logErrorCause } from "../logger";
import { cleanupTmp, disableCoreDump, logTmpUsage } from "../tmp-usage";

const MAX_ENQUEUE_COUNT = 2000;

const program = Effect.gen(function* () {
  yield* disableCoreDump;
  yield* cleanupTmp;
  yield* Effect.promise(() => logTmpUsage("job-number-crawler:start"));

  const queue = yield* JobDetailQueue;
  const enqueuedCountRef = yield* Ref.make(0);

  yield* paginatedJobNumbers().pipe(
    Stream.runForEachWhile((jobNumbers) =>
      Effect.gen(function* () {
        const unregistered = yield* filterUnregistered(jobNumbers);
        yield* Effect.forEach(unregistered, (jobNumber) =>
          queue.send({ jobNumber }),
        );
        const total = yield* Ref.updateAndGet(
          enqueuedCountRef,
          (n) => n + unregistered.length,
        );
        return total <= MAX_ENQUEUE_COUNT;
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
  Effect.provide(APIConfig.main),
  Effect.provide(JobNumberCrawlerConfig.main),
  Effect.provide(ChromiumBrowserConfig.lambda),
  Effect.provide(JobDetailQueue.Default),
  Effect.provide(LoggerLayer),
  Effect.orDie,
);

export const handler = async () => Effect.runPromise(program);
