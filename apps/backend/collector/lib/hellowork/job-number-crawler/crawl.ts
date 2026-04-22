import { JobNumber } from "@sho/models";
import {
  Context,
  Data,
  Effect,
  Either,
  Layer,
  Option,
  Schema,
  Stream,
} from "effect";
import type { DomainError, SystemError } from "../../error";
import { formatParseError } from "../../util";
import type { Locator } from "../browser";
import {
  type DetailedJobSearchCriteria,
  navigateByCriteria as detailedNavigateByCriteria,
  navigateToDetailedJobSearchPage,
} from "../page/detail-search";
import {
  openJobSearchPage,
  type SimpleJobSearchCriteria,
  navigateByCriteria as simpleNavigateByCriteria,
} from "../page/search";
import type { JobListPage } from "./type";

// ============================================================
// Errors
// ============================================================

class JobListPageScraperError extends Data.TaggedError(
  "JobListPageScraperError",
)<SystemError> {}

class JobNumberValidationError extends Data.TaggedError(
  "JobNumberValidationError",
)<DomainError> {}

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
      new JobNumberValidationError({
        reason: `job number validation failed. val=${JSON.stringify(val, null, 2)}\n${formatParseError(result.left)}`,
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
            reason: "failed to extract job number",
            error: e instanceof Error ? e : new Error(String(e)),
          }),
      });
      yield* rawJobNumber === null
        ? Effect.logDebug("Warning: jobNumber textContent is null")
        : Effect.logDebug(`rawJobNumber=${rawJobNumber}`);
      if (rawJobNumber === null) {
        return yield* Effect.fail(
          new JobNumberValidationError({
            reason: "jobNumber is null",
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
        reason: "failed to list job overview elements",
        error: e instanceof Error ? e : new Error(String(e)),
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
        reason: "failed to check next page",
        error: e instanceof Error ? e : new Error(String(e)),
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
        reason: "failed to navigate to next page",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug("navigated to next job list page.");
});

const fetchJobNumbers = Effect.fn("fetchJobNumbers")(function* (
  page: JobListPage,
) {
  const jobOverviewList = yield* listJobOverviewElem(page);
  if (jobOverviewList.length === 0) {
    yield* Effect.logInfo("no job listings found on this page. finishing.");
    return [] as readonly JobNumber[];
  }
  return yield* extractJobNumbers(jobOverviewList);
});

// ============================================================
// SearchConfig (Context.Tag — 簡易検索 / 詳細検索の判別可能 union)
// ============================================================

type SearchConfigValue =
  | { readonly _tag: "simple"; readonly criteria: SimpleJobSearchCriteria }
  | { readonly _tag: "detailed"; readonly criteria: DetailedJobSearchCriteria };

export class SearchConfig extends Context.Tag("SearchConfig")<
  SearchConfig,
  SearchConfigValue
>() {
  static simple = Layer.succeed(SearchConfig, {
    _tag: "simple" as const,
    criteria: {
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
    },
  });
  static detailed = Layer.succeed(SearchConfig, {
    _tag: "detailed" as const,
    criteria: {
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
      searchPeriod: "withinTwoDays",
    },
  });
}

// ============================================================
// CrawlerConfig (Context.Tag — untilCount + SearchConfig 由来の criteria)
// ============================================================
// Layer は SearchConfig に依存する。

export class CrawlerConfig extends Context.Tag("CrawlerConfig")<
  CrawlerConfig,
  { readonly untilCount: number } & SearchConfigValue
>() {
  static main = Layer.effect(
    CrawlerConfig,
    Effect.gen(function* () {
      const search = yield* SearchConfig;
      return { untilCount: 2000, ...search };
    }),
  );
  static dev = Layer.effect(
    CrawlerConfig,
    Effect.gen(function* () {
      const search = yield* SearchConfig;
      return { untilCount: 1, ...search };
    }),
  );
}

// ============================================================
// Crawler (Effect.fn — 手続き的オーケストレーション)
// ============================================================

export const paginatedJobNumbers = () =>
  Stream.unwrap(
    Effect.gen(function* () {
      const config = yield* CrawlerConfig;
      yield* Effect.logInfo(
        `building crawler: config=${JSON.stringify(config, null, 2)}`,
      );
      const jobSearchPage = yield* openJobSearchPage();
      yield* Effect.logInfo("start crawling...");
      const firstJobListPage = yield* config._tag === "simple"
        ? simpleNavigateByCriteria(jobSearchPage, config.criteria)
        : Effect.gen(function* () {
            const detailed =
              yield* navigateToDetailedJobSearchPage(jobSearchPage);
            return yield* detailedNavigateByCriteria(detailed, config.criteria);
          });
      return Stream.paginateEffect(null, () =>
        Effect.gen(function* () {
          const jobNumbers = yield* fetchJobNumbers(firstJobListPage);
          if (jobNumbers.length === 0) {
            return [jobNumbers, Option.none<null>()] as const;
          }
          const hasNext = yield* isNextPageEnabled(firstJobListPage);
          if (hasNext) {
            yield* goToNextJobListPage(firstJobListPage).pipe(
              Effect.andThen(Effect.sleep("2 seconds")),
            );
          }
          return [
            jobNumbers,
            hasNext ? Option.some(null) : Option.none<null>(),
          ] as const;
        }),
      );
    }),
  );
