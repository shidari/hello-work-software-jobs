import { Cause, Effect, Exit, Layer, Schedule } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../lib/job-detail-crawler";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../lib/job-number-crawler/crawl";
import type { SearchPeriod } from "../../lib/job-number-crawler/type";

export const handleScheduled = async (
  trigger: "cron" | "manual" = "cron",
  searchPeriod: SearchPeriod = "today",
  maxCount = 1000,
) => {
  const startedAt = new Date().toISOString();

  const program = Effect.gen(function* () {
    const jobs = yield* crawlJobLinks();

    const results = yield* Effect.forEach(
      jobs,
      (job) =>
        processJob(job.jobNumber).pipe(
          Effect.scoped,
          Effect.retry({
            times: 3,
            schedule: Schedule.exponential("1 second"),
          }),
          Effect.matchEffect({
            onSuccess: () =>
              Effect.succeed({
                jobNumber: job.jobNumber,
                status: "success" as const,
              }),
            onFailure: (cause) =>
              Effect.gen(function* () {
                yield* Effect.logError(
                  JSON.stringify({
                    type: "job_detail_run",
                    jobNumber: job.jobNumber,
                    status: "failed",
                    errorMessage: String(cause),
                  }),
                );
                return {
                  jobNumber: job.jobNumber,
                  status: "failed" as const,
                };
              }),
          }),
        ),
      { concurrency: 2 },
    );

    const succeeded = results.filter((r) => r.status === "success");
    const failed = results.filter((r) => r.status === "failed");
    return { jobs, succeeded, failed };
  });

  const crawlerConfigLayer = Layer.succeed(
    JobNumberCrawlerConfig,
    new JobNumberCrawlerConfig({
      config: {
        jobSearchCriteria: {
          workLocation: { prefecture: "東京都" },
          desiredOccupation: {
            occupationSelection: "ソフトウェア開発技術者、プログラマー",
          },
          employmentType: "RegularEmployee",
          searchPeriod,
        },
        roughMaxCount: maxCount,
      },
    }),
  );

  const deps = Layer.mergeAll(
    crawlerConfigLayer,
    JobDetailExtractor.Default,
    JobDetailTransformer.Default,
    JobDetailLoader.Default,
  ).pipe(Layer.provideMerge(PlaywrightChromium.Default));

  const runnable = program.pipe(Effect.provide(deps), Effect.scoped);
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const { jobs, succeeded, failed } = exit.value;
    console.log(
      JSON.stringify({
        type: "crawler_run",
        status: "success",
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        fetchedCount: jobs.length,
        succeededCount: succeeded.length,
        failedCount: failed.length,
      }),
    );
    return jobs;
  }

  const errorMessage = Cause.pretty(exit.cause);
  console.error(
    JSON.stringify({
      type: "crawler_run",
      status: "failed",
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      fetchedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      errorMessage,
    }),
  );
  throw new Error(`handler failed: ${errorMessage}`);
};
