import { JobNumber } from "@sho/models";
import {
  Chunk,
  Data,
  Effect,
  Either,
  Layer,
  Option,
  Schema,
  Stream,
} from "effect";
import type { Locator } from "../browser";
import {
  type JobSearchCriteria,
  navigateByCriteria,
  openJobSearchPage,
} from "../page";
import { delay, formatParseError } from "../util";
import type { JobListPage } from "./type";

// ============================================================
// Types
// ============================================================

export type CrawlerConfig = {
  readonly jobSearchCriteria: JobSearchCriteria;
  readonly nextPageDelayMs: number;
  readonly roughMaxCount: number;
};

// ── Errors ──

class JobListPageScraperError extends Data.TaggedError(
  "JobListPageScraperError",
)<{ readonly message: string; readonly error?: unknown }> {}

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
    return yield* Effect.die(
      new Error(
        `job number validation failed. val=${JSON.stringify(val, null, 2)}\n${formatParseError(result.left)}`,
      ),
    );
  return result.right;
});

const extractJobNumbers = Effect.fn("extractJobNumbers")(function* (
  jobOverviewList: Locator[],
) {
  return yield* Effect.forEach(jobOverviewList, (table) =>
    Effect.gen(function* () {
      const rawJobNumber = yield* Effect.orDieWith(
        Effect.tryPromise({
          try: async () => {
            const text = await table
              .locator("button.qr_btn[data-id]")
              .getAttribute("data-id");
            return text;
          },
          catch: (e) =>
            new JobListPageScraperError({
              message: "failed to extract job number",
              error: e,
            }),
        }),
        (e) =>
          new Error(
            `failed to extract job number: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
          ),
      );
      yield* rawJobNumber === null
        ? Effect.logDebug("Warning: jobNumber textContent is null")
        : Effect.logDebug(`rawJobNumber=${rawJobNumber}`);
      if (rawJobNumber === null) {
        return yield* Effect.die(new Error("jobNumber is null"));
      }
      return yield* validateJobNumber(rawJobNumber.trim());
    }),
  );
});

const listJobOverviewElem = Effect.fn("listJobOverviewElem")(function* (
  page: JobListPage,
) {
  return yield* Effect.orDieWith(
    Effect.tryPromise({
      try: () => page.locator("table.kyujin").all(),
      catch: (e) =>
        new JobListPageScraperError({
          message: "failed to list job overview elements",
          error: e,
        }),
    }),
    (e) =>
      new Error(
        `failed to list job overview elements: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  ).pipe(
    Effect.tap((list) =>
      Effect.logDebug(`listed job overview elements. count=${list.length}`),
    ),
  );
});

const isNextPageEnabled = Effect.fn("isNextPageEnabled")(function* (
  page: JobListPage,
) {
  return yield* Effect.orDieWith(
    Effect.tryPromise({
      try: async () => {
        const nextPageBtn = page.locator('input[value="次へ＞"]').first();
        return !(await nextPageBtn.isDisabled());
      },
      catch: (e) =>
        new JobListPageScraperError({
          message: "failed to check next page",
          error: e,
        }),
    }),
    (e) =>
      new Error(
        `failed to check next page: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  ).pipe(
    Effect.tap((enabled) =>
      Effect.logDebug(`is next page enabled: ${enabled}`),
    ),
  );
});

const goToNextJobListPage = Effect.fn("goToNextJobListPage")(function* (
  page: JobListPage,
) {
  yield* Effect.orDieWith(
    Effect.tryPromise({
      try: async () => {
        const nextButton = page.locator('input[value="次へ＞"]').first();
        await nextButton.click();
      },
      catch: (e) =>
        new JobListPageScraperError({
          message: "failed to navigate to next page",
          error: e,
        }),
    }),
    (e) =>
      new Error(
        `failed to navigate to next page: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  yield* Effect.logDebug("navigated to next job list page.");
});

const fetchJobMetaData = Effect.fn("fetchJobMetaData")(function* (
  page: JobListPage,
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

export class JobNumberCrawlerConfig extends Effect.Tag(
  "JobNumberCrawlerConfig",
)<JobNumberCrawlerConfig, CrawlerConfig>() {
  static main = Layer.succeed(JobNumberCrawlerConfig, {
    jobSearchCriteria: {
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
    },
    nextPageDelayMs: 3000,
    roughMaxCount: 1000,
  });
  static dev = Layer.succeed(JobNumberCrawlerConfig, {
    jobSearchCriteria: {
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
    },
    nextPageDelayMs: 3000,
    roughMaxCount: 50,
  });
}

// ============================================================
// Crawler (Effect.fn — 手続き的オーケストレーション)
// ============================================================

export const crawlJobLinks = Effect.fn("crawlJobLinks")(function* () {
  const config = yield* JobNumberCrawlerConfig;
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
    // 後で対処する
    (args) =>
      fetchJobMetaData(firstJobListPage as unknown as JobListPage, args),
  );
  const chunk = yield* Stream.runCollect(stream);
  const jobLinks = Chunk.toArray(chunk);
  yield* Effect.logInfo(`crawling finished. total: ${jobLinks.length}`);
  return jobLinks;
});
