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
  navigateByCriteria,
  openJobSearchPage,
} from "../page";
import { delay, formatParseError } from "../util";
import type { JobListPage } from "./type";

// ============================================================
// Schemas
// ============================================================

export const engineeringLabelSchema = Schema.Literal(
  "ソフトウェア開発技術者、プログラマー",
);

export const jobSearchCriteriaSchema = Schema.Struct({
  jobNumber: Schema.optional(JobNumber),
  desiredOccupation: Schema.optionalWith(
    Schema.Struct({
      occupationSelection: Schema.optional(engineeringLabelSchema),
    }),
    {
      default: () => ({
        occupationSelection: "ソフトウェア開発技術者、プログラマー" as const,
      }),
    },
  ),
});

export const crawlerConfigSchema = Schema.Struct({
  jobSearchCriteria: Schema.optionalWith(jobSearchCriteriaSchema, {
    default: () => ({
      desiredOccupation: {
        occupationSelection:
          "ソフトウェア開発技術者、プログラマー" as const,
      },
    }),
  }),
  nextPageDelayMs: Schema.optionalWith(Schema.Number, {
    default: () => 3000,
  }),
  roughMaxCount: Schema.optionalWith(
    Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(1000),
    ),
    { default: () => 1000 },
  ),
});

// ============================================================
// Types
// ============================================================

export type JobSearchCriteria = typeof jobSearchCriteriaSchema.Type;
export type EngineeringLabel = typeof engineeringLabelSchema.Type;
export type CrawlerConfig = typeof crawlerConfigSchema.Type;

// ============================================================
// Errors
// ============================================================

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
            .locator("button.qr_btn[data-id]")
            .getAttribute("data-id");
          return text;
        },
        catch: (e) =>
          new JobListPageScraperError({
            message: "failed to extract job number",
            error: e,
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
  page: JobListPage,
) {
  return yield* Effect.tryPromise({
    try: () => page.locator("table.kyujin").all(),
    catch: (e) =>
      new JobListPageScraperError({
        message: "failed to list job overview elements",
        error: e,
      }),
  }).pipe(
    Effect.tap((list) =>
      Effect.logDebug(`listed job overview elements. count=${list.length}`),
    ),
  );
});

const isNextPageEnabled = Effect.fn("isNextPageEnabled")(function* (
  page: JobListPage,
) {
  return yield* Effect.tryPromise({
    try: async () => {
      const nextPageBtn = page.locator('input[value="次へ＞"]').first();
      return !(await nextPageBtn.isDisabled());
    },
    catch: (e) =>
      new JobListPageScraperError({
        message: "failed to check next page",
        error: e,
      }),
  }).pipe(
    Effect.tap((enabled) =>
      Effect.logDebug(`is next page enabled: ${enabled}`),
    ),
  );
});

const goToNextJobListPage = Effect.fn("goToNextJobListPage")(function* (
  page: JobListPage,
) {
  yield* Effect.tryPromise({
    try: async () => {
      const nextButton = page.locator('input[value="次へ＞"]').first();
      await nextButton.click();
    },
    catch: (e) =>
      new JobListPageScraperError({
        message: "failed to navigate to next page",
        error: e,
      }),
  }).pipe(
    Effect.tap(() => Effect.logDebug("navigated to next job list page.")),
  );
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

export const decodeCrawlerConfig = Schema.decodeSync(crawlerConfigSchema);

export class JobNumberCrawlerConfig extends Effect.Tag(
  "JobNumberCrawlerConfig",
)<JobNumberCrawlerConfig, CrawlerConfig>() {
  static main = Layer.succeed(JobNumberCrawlerConfig, decodeCrawlerConfig({}));
  static dev = Layer.succeed(
    JobNumberCrawlerConfig,
    decodeCrawlerConfig({ roughMaxCount: 50 }),
  );
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
    (args) => fetchJobMetaData(firstJobListPage as unknown as JobListPage, args),
  );
  const chunk = yield* Stream.runCollect(stream);
  const jobLinks = Chunk.toArray(chunk);
  yield* Effect.logInfo(`crawling finished. total: ${jobLinks.length}`);
  return jobLinks;
});
