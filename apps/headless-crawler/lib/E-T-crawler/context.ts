import type { etCrawlerConfig, JobListPage, JobMetadata } from "@sho/models";
import { Chunk, Config, Context, Effect, Layer, Option, Stream } from "effect";
import {
  createContext,
  createPage,
  launchBrowser,
} from "../core/headless-browser";
import { delay } from "../core/util";
import type { JobListPageValidationError } from "../core/page/JobList/validators/error";
import type { JobSearchPageValidationError } from "../core/page/JobSearch/validators/error";
import type {
  IsNextPageEnabledError,
  JobNumberValidationError,
  ListJobsError,
} from "../core/page/others/error";
import type {
  EmploymentLabelToSelectorError,
  EngineeringLabelSelectorError,
  JobSearchCriteriaFillFormError,
} from "../core/page/JobSearch/form-fillings/error";
import type {
  GoToJobSearchPageError,
  SearchThenGotoJobListPageError,
} from "../core/page/JobSearch/navigations/error";
import type { NextJobListPageError } from "../core/page/JobList/navigations/error";
import {
  goToJobSearchPage,
  searchThenGotoJobListPage,
} from "../core/page/JobSearch/navigations";
import { isNextPageEnabled, listJobOverviewElem } from "../core/page/others";
import { goToNextJobListPage } from "../core/page/JobList/navigations";
import { validateJobSearchPage } from "../core/page/JobSearch/validators";
import { validateJobListPage } from "../core/page/JobList/validators";
import { extractJobNumbers } from "../core/page/JobList/extractors";
import type { ExtractJobNumbersError } from "../core/page/JobList/extractors/error";
import {
  GetExecutablePathError,
  ImportChromiumError,
} from "../core/headless-browser/error";

export class ExtractorAndTransformerConfig extends Context.Tag(
  "ExtractorAndTransformerConfig",
)<
  ExtractorAndTransformerConfig,
  {
    readonly getConfig: etCrawlerConfig;
  }
>() {}

const extractorAndTransfomerConfigLive = Layer.effect(
  ExtractorAndTransformerConfig,
  Effect.gen(function* () {
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
    return {
      getConfig: {
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
        roughMaxCount: 800,
      },
    } as const;
  }),
);
export class HelloWorkCrawler extends Context.Tag("HelloWorkCrawler")<
  HelloWorkCrawler,
  {
    readonly crawlJobLinks: () => Effect.Effect<
      JobMetadata[],
      | ListJobsError
      | EngineeringLabelSelectorError
      | JobSearchCriteriaFillFormError
      | ExtractJobNumbersError
      | EmploymentLabelToSelectorError
      | SearchThenGotoJobListPageError
      | JobListPageValidationError
      | JobSearchPageValidationError
      | GoToJobSearchPageError
      | NextJobListPageError
      | IsNextPageEnabledError
      | JobNumberValidationError
    >;
  }
>() {}

export const crawlerLive = Layer.effect(
  HelloWorkCrawler,
  Effect.gen(function* () {
    const config = (yield* ExtractorAndTransformerConfig).getConfig;
    yield* Effect.logInfo(
      `building crawler: config=${JSON.stringify(config, null, 2)}`,
    );
    const browser = yield* launchBrowser(config.browserConfig);
    const context = yield* createContext(browser);
    const page = yield* createPage(context);
    return HelloWorkCrawler.of({
      crawlJobLinks: () =>
        Effect.gen(function* () {
          yield* Effect.logInfo("start crawling...");
          yield* goToJobSearchPage(page);
          const searchPage = yield* validateJobSearchPage(page);
          yield* searchThenGotoJobListPage(
            searchPage,
            config.jobSearchCriteria,
          );
          const jobListPage = yield* validateJobListPage(page);
          const initialCount = 0;
          const stream = Stream.paginateChunkEffect(
            {
              jobListPage,
              count: initialCount,
              roughMaxCount: config.roughMaxCount,
              nextPageDelayMs: config.nextPageDelayMs,
            },
            fetchJobMetaData,
          );
          const chunk = yield* Stream.runCollect(stream);
          const jobLinks = Chunk.toArray(chunk);
          yield* Effect.logInfo(`crawling finished. total: ${jobLinks.length}`);
          return jobLinks;
        }),
    });
  }),
);

export const mainLive = crawlerLive.pipe(
  Layer.provide(extractorAndTransfomerConfigLive),
);

function fetchJobMetaData({
  jobListPage,
  count,
  roughMaxCount,
  nextPageDelayMs,
}: {
  jobListPage: JobListPage;
  count: number;
  roughMaxCount: number;
  nextPageDelayMs: number;
}) {
  return Effect.gen(function* () {
    const jobOverviewList = yield* listJobOverviewElem(jobListPage);
    const jobNumbers = (yield* extractJobNumbers(jobOverviewList)).map(
      (jobNumber) => ({
        jobNumber,
      }),
    );
    const chunked = Chunk.fromIterable(jobNumbers);
    const tmpTotal = count + jobNumbers.length;
    const nextPageEnabled = yield* isNextPageEnabled(jobListPage);
    if (nextPageEnabled) {
      yield* goToNextJobListPage(jobListPage);
    }
    yield* delay(nextPageDelayMs);
    return [
      chunked,
      nextPageEnabled && tmpTotal <= roughMaxCount
        ? Option.some({
            jobListPage: jobListPage,
            count: tmpTotal,
            roughMaxCount,
            nextPageDelayMs, // 後で構造修正する予定
          })
        : Option.none(),
    ] as const;
  });
}
