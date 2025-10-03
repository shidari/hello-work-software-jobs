import type { JobNumber, ScrapedJob } from "@sho/models";
import { Context, Data, Effect, Layer } from "effect";
import {
  createContext,
  createPage,
  launchBrowser,
} from "../core/headless-browser";
import type { NewPageError } from "../core/headless-browser/error";
import type { HelloWorkScrapingConfig } from "../config/scraper";
import type { JobListPageValidationError } from "../core/page/JobList/validators/error";
import type { JobSearchPageValidationError } from "../core/page/JobSearch/validators/error";
import type { JobNumberValidationError, ListJobsError } from "../core/page/others/error";
import type { AssertSingleJobListedError } from "../core/page/JobList/assertions/error";
import type {
  GoToJobSearchPageError,
  SearchThenGotoFirstJobListPageError,
} from "../core/page/JobSearch/navigations/error";
import type { FromJobListToJobDetailPageError } from "../core/page/JobList/navigations/error";
import type { JobSearchWithJobNumberFillingError } from "../core/page/JobSearch/form-fillings/error";
import {
  goToJobSearchPage,
  searchNoThenGotoSingleJobListPage,
} from "../core/page/JobSearch/navigations";
import { goToSingleJobDetailPage } from "../core/page/JobList/navigations";
import { validateJobSearchPage } from "../core/page/JobSearch/validators";
import { validateJobListPage } from "../core/page/JobList/validators";
import { validateJobDetailPage } from "../jobDetailPage/helpers/validators";
import { extractJobInfo } from "../jobDetailPage/helpers/extractors";
import type { JobDetailPageValidationError, JobDetailPropertyValidationError } from "../jobDetailPage/helpers/validators/error";
import type { ExtractTextContentError } from "../jobDetailPage/helpers/extractors/error";
import type { HomePageElmNotFoundError, QualificationsElmNotFoundError } from "../jobDetailPage/helpers/checkers/error";

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
      | GoToJobSearchPageError
      | SearchThenGotoFirstJobListPageError
      | FromJobListToJobDetailPageError
      | JobSearchPageValidationError
      | JobListPageValidationError
      | JobSearchWithJobNumberFillingError
      | JobDetailPageValidationError
      | ExtractTextContentError
      | JobNumberValidationError
      | JobDetailPropertyValidationError
      | HomePageElmNotFoundError
      | QualificationsElmNotFoundError
    >;
  }
>() { }

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
            yield* Effect.logInfo(`start scrapling... jobNumber=${jobNumber}`);
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
}> { }
