import { JobNumber } from "@sho/models";
import { Chunk, Data, Effect, Either, Option, Schema, Stream } from "effect";
import type { Locator } from "../browser";
import {
  type FirstJobListPage,
  navigateByCriteria,
  openJobSearchPage,
} from "../page";
import { delay, formatParseError } from "../util";
import type { etCrawlerConfig } from "./type";

// ============================================================
// Errors
// ============================================================

class JobListPageScraperError extends Data.TaggedError(
  "JobListPageScraperError",
)<{ readonly message: string }> {}

// ============================================================
// Functions
// ============================================================

const validateJobNumber = Effect.fn("validateJobNumber")(function* (
  val: unknown,
) {
  yield* Effect.logDebug(
    `calling validateJobNumber. args={val:${JSON.stringify(val, null, 2)}}`,
  );
  const result = Schema.decodeUnknownEither(JobNumber)(val);
  if (Either.isLeft(result))
    return yield* Effect.fail(
      new JobListPageScraperError({
        message: `job number validation failed. val=${JSON.stringify(val, null, 2)}\n${formatParseError(result.left)}`,
      }),
    );
  return result.right;
});

const extractJobNumbers = Effect.fn("extractJobNumbers")(function* (
  jobOverviewList: Locator[],
) {
  return yield* Effect.forEach(jobOverviewList, (table) =>
    Effect.gen(function* () {
      const rawJobNumber = yield* Effect.tryPromise({
        try: async () => {
          const text = await table
            .locator("div.right-side")
            .locator("tr")
            .nth(3)
            .locator("td")
            .nth(1)
            .textContent();
          return text;
        },
        catch: (e) =>
          new JobListPageScraperError({
            message: `failed to extract job number. ${String(e)}`,
          }),
      }).pipe(
        Effect.tap((raw) =>
          raw === null
            ? Effect.logDebug("Warning: jobNumber textContent is null")
            : Effect.logDebug(`rawJobNumber=${raw}`),
        ),
      );
      if (rawJobNumber === null) {
        return yield* Effect.fail(
          new JobListPageScraperError({
            message: "jobNumber is null",
          }),
        );
      }
      return yield* validateJobNumber(rawJobNumber.trim());
    }),
  );
});

const listJobOverviewElem = Effect.fn("listJobOverviewElem")(function* (
  page: FirstJobListPage,
) {
  return yield* Effect.tryPromise({
    try: () => page.locator("table.kyujin.mt1.noborder").all(),
    catch: (e) =>
      new JobListPageScraperError({
        message: `failed to list job overview elements. ${String(e)}`,
      }),
  }).pipe(
    Effect.tap((list) =>
      Effect.logDebug(`listed job overview elements. count=${list.length}`),
    ),
  );
});

const isNextPageEnabled = Effect.fn("isNextPageEnabled")(function* (
  page: FirstJobListPage,
) {
  return yield* Effect.tryPromise({
    try: async () => {
      const nextPageBtn = page.locator('input[value="次へ＞"]').first();
      return !(await nextPageBtn.isDisabled());
    },
    catch: (e) =>
      new JobListPageScraperError({
        message: `failed to check next page. ${String(e)}`,
      }),
  }).pipe(
    Effect.tap((enabled) =>
      Effect.logDebug(`is next page enabled: ${enabled}`),
    ),
  );
});

const goToNextJobListPage = Effect.fn("goToNextJobListPage")(function* (
  page: FirstJobListPage,
) {
  yield* Effect.tryPromise({
    try: async () => {
      const nextButton = page.locator('input[value="次へ＞"]').first();
      await nextButton.click();
    },
    catch: (e) =>
      new JobListPageScraperError({
        message: `failed to navigate to next page. ${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() => Effect.logDebug("navigated to next job list page.")),
  );
});

const fetchJobMetaData = Effect.fn("fetchJobMetaData")(function* (
  page: FirstJobListPage,
  args: {
    count: number;
    roughMaxCount: number;
    nextPageDelayMs: number;
  },
) {
  const { count, roughMaxCount, nextPageDelayMs } = args;
  const jobOverviewList = yield* listJobOverviewElem(page);
  if (jobOverviewList.length === 0) {
    yield* Effect.logInfo("no job listings found on this page. finishing.");
    return [Chunk.empty(), Option.none()] as const;
  }
  const jobNumbers = (yield* extractJobNumbers(jobOverviewList)).map(
    (jobNumber) => ({ jobNumber }),
  );
  const chunked = Chunk.fromIterable(jobNumbers);
  const tmpTotal = count + jobNumbers.length;
  const nextPageEnabled = yield* isNextPageEnabled(page);
  if (nextPageEnabled) {
    yield* goToNextJobListPage(page);
  }
  yield* delay(nextPageDelayMs);
  return [
    chunked,
    nextPageEnabled && tmpTotal <= roughMaxCount
      ? Option.some({
          count: tmpTotal,
          roughMaxCount,
          nextPageDelayMs,
        })
      : Option.none(),
  ] as const;
});

// ============================================================
// Config (Effect.Service — 環境切り替え)
// ============================================================

export class JobNumberCrawlerConfig extends Effect.Service<JobNumberCrawlerConfig>()(
  "JobNumberCrawlerConfig",
  {
    effect: Effect.succeed({
      config: {
        nextPageDelayMs: 3000,
        jobSearchCriteria: {
          workLocation: { prefecture: "東京都" },
          desiredOccupation: {
            occupationSelection: "ソフトウェア開発技術者、プログラマー",
          },
          employmentType: "RegularEmployee",
          searchPeriod: "today",
        },
        roughMaxCount: 1600,
      } satisfies etCrawlerConfig,
    }),
  },
) {
  static dev = new JobNumberCrawlerConfig({
    config: {
      nextPageDelayMs: 3000,
      jobSearchCriteria: {
        workLocation: { prefecture: "東京都" },
        desiredOccupation: {
          occupationSelection: "ソフトウェア開発技術者、プログラマー",
        },
        employmentType: "RegularEmployee",
        searchPeriod: "today",
      },
      roughMaxCount: 50,
    },
  });
}

// ============================================================
// Crawler (Effect.fn — 手続き的オーケストレーション)
// ============================================================

export const crawlJobLinks = Effect.fn("crawlJobLinks")(function* () {
  const config = (yield* JobNumberCrawlerConfig).config;
  yield* Effect.logInfo(
    `building crawler: config=${JSON.stringify(config, null, 2)}`,
  );
  const jobSearchPage = yield* openJobSearchPage();
  yield* Effect.logInfo("start crawling...");
  const firstJobListPage = yield* navigateByCriteria(
    jobSearchPage,
    config.jobSearchCriteria,
  );
  const stream = Stream.paginateChunkEffect(
    {
      count: 0,
      roughMaxCount: config.roughMaxCount,
      nextPageDelayMs: config.nextPageDelayMs,
    },
    (args) => fetchJobMetaData(firstJobListPage, args),
  );
  const chunk = yield* Stream.runCollect(stream);
  const jobLinks = Chunk.toArray(chunk);
  yield* Effect.logInfo(`crawling finished. total: ${jobLinks.length}`);
  return jobLinks;
});
