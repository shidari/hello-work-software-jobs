import type { JobNumber, ScrapedJob } from "@sho/models";
import { Context, Data, Effect, Layer } from "effect";
import {
  extractJobInfo,
  type FromJobListToJobDetailPageError,
  goToJobSearchPage,
  goToSingleJobDetailPage,
  searchNoThenGotoSingleJobListPage,
} from "../core/browser";
import type { AssertSingleJobListedError } from "../core/browser/assertion/error";
import {
  createContext,
  createPage,
  launchBrowser,
} from "../core/browser/builder";
import type { NewPageError } from "../core/browser/builder/error";
import type {
  HomePageElmNotFoundError,
  ListJobsError,
  QualificationsElmNotFoundError,
} from "../core/browser/interactions/element-action/error";
import type { ExtractTextContentError } from "../core/browser/interactions/extraction/jobDetail/error";
import type { JobSearchWithJobNumberFillingError } from "../core/browser/interactions/form-filling/jobSearch/error";
import type {
  GoToJobSearchPageError,
  SearchThenGotoFirstJobListPageError,
} from "../core/browser/interactions/navigation/error";
import type { HelloWorkScrapingConfig } from "../config/scraper";
import {
  validateJobDetailPage,
  validateJobListPage,
  validateJobSearchPage,
} from "../core/validation";
import type {
  JobDetailPageValidationError,
  JobDetailPropertyValidationError,
} from "../core/validation/jobDetail/error";
import type { JobListPageValidationError } from "../core/validation/jobList/error";
import type { JobSearchPageValidationError } from "../core/validation/jobSearch/error";

export class HelloWorkScraper extends Context.Tag("HelloWorkScraper")<
  HelloWorkScraper,
  {
    readonly scrapeJobData: (
      jobNumber: JobNumber,
    ) => Effect.Effect<
      ScrapedJob,
      | ListJobsError
      | ScrapeJobDataError
      | NewPageError
      | AssertSingleJobListedError
      | HomePageElmNotFoundError
      | QualificationsElmNotFoundError
      | GoToJobSearchPageError
      | SearchThenGotoFirstJobListPageError
      | FromJobListToJobDetailPageError
      | JobSearchPageValidationError
      | JobListPageValidationError
      | JobDetailPageValidationError
      | JobDetailPropertyValidationError
      | ExtractTextContentError
      | JobSearchWithJobNumberFillingError
    >;
  }
>() {}

export function buildHelloWorkScrapingLayer(config: HelloWorkScrapingConfig) {
  return Layer.effect(
    HelloWorkScraper,
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `building scraper: config=${JSON.stringify(config, null, 2)}`,
      );
      const browser = yield* launchBrowser(config.browserConfig);
      const context = yield* createContext(browser);
      const page = yield* createPage(context);
      return HelloWorkScraper.of({
        scrapeJobData: (jobNumber: JobNumber) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start scrapling...");
            yield* Effect.logDebug("go to hello work seach page.");
            yield* goToJobSearchPage(page);
            const searchPage = yield* validateJobSearchPage(page);
            yield* Effect.logDebug(
              "fill jobNumber then go to hello work seach page.",
            );
            yield* searchNoThenGotoSingleJobListPage(searchPage, jobNumber);
            const jobListPage = yield* validateJobListPage(searchPage);
            yield* Effect.logDebug("now on job List page.");

            yield* goToSingleJobDetailPage(jobListPage);
            const jobDetailPage = yield* validateJobDetailPage(jobListPage);
            const jobInfo = yield* extractJobInfo(jobDetailPage);
            return jobInfo;
          }),
      });
    }),
  );
}

class ScrapeJobDataError extends Data.TaggedError("ScrapeJobDataError")<{
  readonly message: string;
}> {}
