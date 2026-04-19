import type { AppType } from "@sho/api/types";
import type { JobNumber } from "@sho/models";
import { Config, Data, Effect } from "effect";
import { hc } from "hono/client";
import { ChromiumBrowserConfig } from "../../../lib/browser";
import type { SystemError } from "../../../lib/error";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";
import { LoggerLayer, logErrorCause } from "../logger";
import { cleanupTmp, disableCoreDump, logTmpUsage } from "../tmp-usage";

class JobStoreExistsError extends Data.TaggedError(
  "JobStoreExistsError",
)<SystemError> {}

class JobStoreExistsResponseError extends Data.TaggedError(
  "JobStoreExistsResponseError",
)<{
  readonly reason: string;
  readonly status: number;
  readonly body: string;
}> {}

const filterUnregistered = Effect.fn("filterUnregistered")(function* (
  jobs: readonly { jobNumber: JobNumber }[],
) {
  if (jobs.length === 0) return jobs;
  const endpoint = yield* Config.string("JOB_STORE_ENDPOINT");
  const apiKey = yield* Config.string("API_KEY");
  const client = hc<AppType>(endpoint, { headers: { "x-api-key": apiKey } });
  const res = yield* Effect.tryPromise({
    try: () =>
      client.jobs.exists.$post({
        json: { jobNumbers: jobs.map((j) => j.jobNumber) },
      }),
    catch: (e) =>
      new JobStoreExistsError({
        reason: "filterUnregistered fetch failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  if (!res.ok) {
    const text = yield* Effect.promise(() =>
      res.text().catch(() => "<unreadable>"),
    );
    return yield* Effect.fail(
      new JobStoreExistsResponseError({
        reason: `jobs/exists API responded with ${res.status}`,
        status: res.status,
        body: text,
      }),
    );
  }
  const body = yield* Effect.promise(() => res.json());
  const existingSet = new Set<string>(body.existing);
  const unregistered = jobs.filter((j) => !existingSet.has(j.jobNumber));
  yield* Effect.logInfo("filtered existing job numbers").pipe(
    Effect.annotateLogs({
      total: jobs.length,
      existing: body.existing.length,
      unregistered: unregistered.length,
    }),
  );
  return unregistered;
});

const program = Effect.gen(function* () {
  yield* disableCoreDump;
  yield* cleanupTmp;
  yield* Effect.promise(() => logTmpUsage("job-number-crawler:start"));

  const queue = yield* JobDetailQueue;
  const jobs = yield* crawlJobLinks();
  const unregistered = yield* filterUnregistered(jobs);
  yield* Effect.forEach(unregistered, (job) => queue.send(job));

  yield* Effect.logInfo("job number crawler success").pipe(
    Effect.annotateLogs({
      crawledCount: jobs.length,
      enqueuedCount: unregistered.length,
    }),
  );

  return unregistered;
}).pipe(
  Effect.ensuring(cleanupTmp),
  Effect.tapErrorCause((cause) =>
    logErrorCause("job number crawler failed", cause),
  ),
  Effect.scoped,
  Effect.provide(JobNumberCrawlerConfig.main),
  Effect.provide(ChromiumBrowserConfig.lambda),
  Effect.provide(JobDetailQueue.Default),
  Effect.provide(LoggerLayer),
  Effect.orDie,
);

export const handler = async () => Effect.runPromise(program);
