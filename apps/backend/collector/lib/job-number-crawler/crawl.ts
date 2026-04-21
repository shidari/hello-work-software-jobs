import { JobNumber } from "@sho/models";
import {
  Data,
  Effect,
  Either,
  Layer,
  Option,
  Schema,
  Stream,
} from "effect";
import type { Locator } from "../browser";
import type { DomainError, SystemError } from "../error";
import {
  type JobSearchCriteria,
  navigateByCriteria,
  openJobSearchPage,
} from "../page";
import { formatParseError } from "../util";
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
// Config (Effect.Service — 環境切り替え)
// ============================================================

export class JobNumberCrawlerConfig extends Effect.Tag(
  "JobNumberCrawlerConfig",
)<
  JobNumberCrawlerConfig,
  {
    readonly jobSearchCriteria: JobSearchCriteria;
  }
>() {
  static main = Layer.succeed(JobNumberCrawlerConfig, {
    jobSearchCriteria: {
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
    },
  });
  static dev = Layer.succeed(JobNumberCrawlerConfig, {
    jobSearchCriteria: {
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
    },
  });
}

// ============================================================
// Crawler (Effect.fn — 手続き的オーケストレーション)
// ============================================================

export const paginatedJobNumbers = () =>
  Stream.unwrap(
    Effect.gen(function* () {
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
      return Stream.paginateEffect(undefined, () =>
        Effect.gen(function* () {
          const jobNumbers = yield* fetchJobNumbers(firstJobListPage);
          if (jobNumbers.length === 0) {
            return [jobNumbers, Option.none()] as const;
          }
          const hasNext = yield* isNextPageEnabled(firstJobListPage);
          if (hasNext) {
            yield* goToNextJobListPage(firstJobListPage).pipe(
              Effect.andThen(Effect.sleep("2 seconds")),
            );
          }
          return [
            jobNumbers,
            hasNext ? Option.some<void>(undefined) : Option.none(),
          ] as const;
        }),
      );
    }),
  );
