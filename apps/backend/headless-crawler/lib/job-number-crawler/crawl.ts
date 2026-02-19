import {
  Chunk,
  Config,
  Data,
  Effect,
  Either,
  Option,
  Schema,
  Stream,
} from "effect";
import type { Locator } from "playwright";
import { FirstJobListPageNavigator, JobSearchPageService } from "../page";
import type { etCrawlerConfig } from "../schemas";
import { JobNumber } from "../schemas";
import { delay, formatParseError } from "../util";

// ============================================================
// Errors
// ============================================================

class JobListPageScraperError extends Data.TaggedError(
  "JobListPageScraperError",
)<{ readonly message: string }> {}

class ImportChromiumError extends Data.TaggedError("ImportChromiumError")<{
  readonly message: string;
}> {}
class GetExecutablePathError extends Data.TaggedError(
  "GetExecutablePathError",
)<{ readonly message: string }> {}

// ============================================================
// Services
// ============================================================

export class JobListPageScraper extends Effect.Service<JobListPageScraper>()(
  "JobListPageScraper",
  {
    effect: Effect.gen(function* () {
      const { page } = yield* JobSearchPageService;

      // ---- validation ----

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

      // ---- list page operations ----

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

      const listJobOverviewElem = Effect.fn("listJobOverviewElem")(
        function* () {
          return yield* Effect.tryPromise({
            try: () => page.locator("table.kyujin.mt1.noborder").all(),
            catch: (e) =>
              new JobListPageScraperError({
                message: `failed to list job overview elements. ${String(e)}`,
              }),
          }).pipe(
            Effect.flatMap((tables) =>
              tables.length === 0
                ? Effect.fail(
                    new JobListPageScraperError({
                      message: "jobOverviewList is empty.",
                    }),
                  )
                : Effect.succeed(tables),
            ),
            Effect.tap((list) =>
              Effect.logDebug(
                `succeeded to list job overview elements. count=${list.length}`,
              ),
            ),
          );
        },
      );

      const isNextPageEnabled = Effect.fn("isNextPageEnabled")(function* () {
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

      const goToNextJobListPage = Effect.fn("goToNextJobListPage")(
        function* () {
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
            Effect.tap(() =>
              Effect.logDebug("navigated to next job list page."),
            ),
          );
        },
      );

      // ---- pagination ----

      const fetchJobMetaData = Effect.fn("fetchJobMetaData")(function* (args: {
        count: number;
        roughMaxCount: number;
        nextPageDelayMs: number;
      }) {
        const { count, roughMaxCount, nextPageDelayMs } = args;
        const jobOverviewList = yield* listJobOverviewElem();
        const jobNumbers = (yield* extractJobNumbers(jobOverviewList)).map(
          (jobNumber) => ({ jobNumber }),
        );
        const chunked = Chunk.fromIterable(jobNumbers);
        const tmpTotal = count + jobNumbers.length;
        const nextPageEnabled = yield* isNextPageEnabled();
        if (nextPageEnabled) {
          yield* goToNextJobListPage();
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

      return { fetchJobMetaData };
    }),
    dependencies: [JobSearchPageService.Default],
  },
) {}

// Config
export class JobNumberCrawlerConfig extends Effect.Service<JobNumberCrawlerConfig>()(
  "JobNumberCrawlerConfig",
  {
    effect: Effect.gen(function* () {
      const AWS_LAMBDA_FUNCTION_NAME = yield* Config.string(
        "AWS_LAMBDA_FUNCTION_NAME",
      ).pipe(Config.withDefault(""));
      const isLambda = !!AWS_LAMBDA_FUNCTION_NAME;
      const chromiumOrNull = yield* Effect.tryPromise({
        try: () =>
          isLambda
            ? import("@sparticuz/chromium").then((mod) => mod.default)
            : Promise.resolve(null),
        catch: (error) =>
          new ImportChromiumError({
            message: `Failed to import chromium: ${String(error)}`,
          }),
      });
      const args = chromiumOrNull ? chromiumOrNull.args : [];
      const executablePath = chromiumOrNull
        ? yield* Effect.tryPromise({
            try: () => chromiumOrNull.executablePath(),
            catch: (error) =>
              new GetExecutablePathError({
                message: `Failed to get chromium executable path: ${String(error)}`,
              }),
          })
        : undefined;
      const config: etCrawlerConfig = {
        browserConfig: {
          headless: false,
          args,
          executablePath: executablePath ?? undefined,
        },
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
      };
      return { config };
    }),
  },
) {
  static dev = new JobNumberCrawlerConfig({
    config: {
      browserConfig: {
        headless: false,
        args: [],
        executablePath: undefined,
      },
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

// Crawler
export class HelloWorkCrawler extends Effect.Service<HelloWorkCrawler>()(
  "HelloWorkCrawler",
  {
    effect: Effect.gen(function* () {
      const config = (yield* JobNumberCrawlerConfig).config;
      yield* Effect.logInfo(
        `building crawler: config=${JSON.stringify(config, null, 2)}`,
      );
      const firstJobListPage = yield* FirstJobListPageNavigator;
      const scraper = yield* JobListPageScraper;
      return {
        crawlJobLinks: () =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start crawling...");
            yield* firstJobListPage.byCriteria(config.jobSearchCriteria);
            const stream = Stream.paginateChunkEffect(
              {
                count: 0,
                roughMaxCount: config.roughMaxCount,
                nextPageDelayMs: config.nextPageDelayMs,
              },
              scraper.fetchJobMetaData,
            );
            const chunk = yield* Stream.runCollect(stream);
            const jobLinks = Chunk.toArray(chunk);
            yield* Effect.logInfo(
              `crawling finished. total: ${jobLinks.length}`,
            );
            return jobLinks;
          }),
      };
    }),
    dependencies: [
      JobNumberCrawlerConfig.Default,
      FirstJobListPageNavigator.Default,
      JobListPageScraper.Default,
    ],
  },
) {}
