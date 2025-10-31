import type { JobNumber } from "@sho/models";
import { Config, Context, Effect, Layer } from "effect";
import {
  createContext,
  createPage,
  launchBrowser,
} from "../../core/headless-browser";
import {
  GetExecutablePathError,
  ImportChromiumError,
  type NewPageError,
} from "../../core/headless-browser/error";
import type { JobListPageValidationError } from "../../core/page/JobList/validators/error";
import type { JobSearchPageValidationError } from "../../core/page/JobSearch/validators/error";
import type { ListJobsError } from "../../core/page/others/error";
import type { AssertSingleJobListedError } from "../../core/page/JobList/assertions/error";
import type {
  GoToJobSearchPageError,
  SearchThenGotoFirstJobListPageError,
} from "../../core/page/JobSearch/navigations/error";
import type { FromJobListToJobDetailPageError } from "../../core/page/JobList/navigations/error";
import type { JobSearchWithJobNumberFillingError } from "../../core/page/JobSearch/form-fillings/error";
import {
  goToJobSearchPage,
  searchNoThenGotoSingleJobListPage,
} from "../../core/page/JobSearch/navigations";
import { goToSingleJobDetailPage } from "../../core/page/JobList/navigations";
import { validateJobDetailPage } from "../helpers/validators";
import type {
  JobDetailPageValidationError,
  JobDetailPropertyValidationError,
} from "../helpers/validators/error";
import { validateJobSearchPage } from "../../core/page/JobSearch/validators";
import { validateJobListPage } from "../../core/page/JobList/validators";
import { format } from "date-fns";
import type { LaunchOptions } from "playwright";
import { ExtractJobDetailRawHtmlError } from "./error";

const i = Symbol();
type ISODateString = string & { [i]: never };
export class HelloWorkRawJobDetailHtmlExtractor extends Context.Tag(
  "HelloWorkRawJobDetailHtmlExtractor",
)<
  HelloWorkRawJobDetailHtmlExtractor,
  {
    readonly extractRawHtml: (
      jobNumber: JobNumber,
    ) => Effect.Effect<
      { rawHtml: string; fetchedDate: ISODateString; jobNumber: JobNumber },
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
>() {}

export class ExtractorConfig extends Context.Tag("ExtractorConfig")<
  ExtractorConfig,
  {
    readonly getConfig: Effect.Effect<{
      readonly debugLog: boolean;
      readonly browserConfig: Pick<
        LaunchOptions,
        "headless" | "executablePath" | "args"
      >;
    }>;
  }
>() {}

export const extractorConfigLive = Layer.effect(
  ExtractorConfig,
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
      getConfig: Effect.succeed({
        debugLog: false,
        browserConfig: {
          headless: false,
          args,
          executablePath: executablePath ?? undefined,
        },
      }),
    };
  }),
);
const nowISODateString = (): ISODateString =>
  format(new Date(), "yyyy-MM-dd") as ISODateString;
export const extractorLive = Layer.effect(
  HelloWorkRawJobDetailHtmlExtractor,
  Effect.gen(function* () {
    // ちょっといい方法思いつかないので、
    const config = yield* ExtractorConfig;
    const config2 = yield* config.getConfig;
    yield* Effect.logInfo(
      `building jobDetail extractor: config=${JSON.stringify(config2, null, 2)}`,
    );
    const browser = yield* launchBrowser(config2.browserConfig);
    const context = yield* createContext(browser);
    const page = yield* createPage(context);
    return {
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
            catch: (error) =>
              new ExtractJobDetailRawHtmlError({
                jobNumber,
                currentUrl: jobDetailPage.url(),
                reason: `${error instanceof Error ? error.message : String(error)}`,
              }),
          });
          return { rawHtml, fetchedDate: nowISODateString(), jobNumber };
        }),
    };
  }),
);
