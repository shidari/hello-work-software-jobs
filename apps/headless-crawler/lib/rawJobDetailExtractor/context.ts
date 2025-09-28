import type { JobNumber } from "@sho/models";
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
import type { ListJobsError } from "../core/page/JobList/others/error";
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
import { validateJobDetailPage } from "../core/page/JobDetail/validators";
import type {
    JobDetailPageValidationError,
    JobDetailPropertyValidationError,
} from "../core/page/JobDetail/validators/error";
import { validateJobSearchPage } from "../core/page/JobSearch/validators";
import { validateJobListPage } from "../core/page/JobList/validators";

export class HelloWorkRawJobDetailHtmlExtractor extends Context.Tag("HelloWorkRawJobDetailHtmlExtractor")<
    HelloWorkRawJobDetailHtmlExtractor,
    {
        readonly extractRawHtml: (
            jobNumber: JobNumber,
        ) => Effect.Effect<
            string,
            | ListJobsError
            | ExtractJobDetailRawHtmlError
            | NewPageError
            | AssertSingleJobListedError
            | GoToJobSearchPageError
            | SearchThenGotoFirstJobListPageError
            | FromJobListToJobDetailPageError
            | JobSearchPageValidationError
            | JobListPageValidationError
            | JobDetailPageValidationError
            | JobDetailPropertyValidationError
            | JobSearchWithJobNumberFillingError
        >;
    }
>() { }

export function buildHelloWorkRawJobDetailHtmlExtractorLayer(config: HelloWorkScrapingConfig) {
    return Layer.effect(
        HelloWorkRawJobDetailHtmlExtractor,
        Effect.gen(function* () {
            yield* Effect.logInfo(
                `building scraper: config=${JSON.stringify(config, null, 2)}`,
            );
            const browser = yield* launchBrowser(config.browserConfig);
            const context = yield* createContext(browser);
            const page = yield* createPage(context);
            return HelloWorkRawJobDetailHtmlExtractor.of({
                extractRawHtml: (jobNumber: JobNumber) =>
                    Effect.gen(function* () {
                        yield* Effect.logInfo("start extracting raw job detail HTML...");
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
                        const rawHtml = yield* Effect.tryPromise({
                            try: () => jobDetailPage.content(),
                            catch: (error) => new ExtractJobDetailRawHtmlError({ message: `Failed to get page content: ${String(error)}` }),
                        });
                        return rawHtml;
                    }),
            });
        }),
    );
}

class ExtractJobDetailRawHtmlError extends Data.TaggedError("ExtractJobDetailRawHtmlError")<{
    readonly message: string;
}> { }
