import type { JobListPage, JobMetadata } from "@sho/models";
import { Chunk, Context, Effect, Layer, Option, Stream } from "effect";
import {
  createContext,
  createPage,
  launchBrowser,
} from "../core/headless-browser";
import type { HelloWorkCrawlingConfig } from "../config/crawler";
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
import {
  isNextPageEnabled,
  listJobOverviewElem,
} from "../core/page/others";
import { goToNextJobListPage } from "../core/page/JobList/navigations";
import { validateJobSearchPage } from "../core/page/JobSearch/validators";
import { validateJobListPage } from "../core/page/JobList/validators";
import { extractJobNumbers } from "../core/page/JobList/extractors";
import type { ExtractJobNumbersError } from "../core/page/JobList/extractors/error";
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
>() { }

export const buildHelloWorkCrawlerLayer = (config: HelloWorkCrawlingConfig) => {
  return Layer.effect(
    HelloWorkCrawler,
    Effect.gen(function* () {
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
            yield* Effect.logInfo(
              `crawling finished. total: ${jobLinks.length}`,
            );
            return jobLinks;
          }),
      });
    }),
  );
};

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
