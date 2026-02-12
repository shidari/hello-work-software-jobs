import type {
  DirtyWorkLocation,
  EmploymentType,
  EmploymentTypeSelector,
  EngineeringLabel,
  EngineeringLabelSelector,
  EngineeringLabelSelectorOpenerSibling,
  EngineeringLabelSelectorRadioBtn,
  etCrawlerConfig,
  JobListPage,
  JobOverViewList,
  JobSearchCriteria,
  JobSearchPage,
  SearchPeriod,
} from "@sho/models";
import { jobNumberSchema } from "@sho/models";
import { Chunk, Config, Data, Effect, Option, Stream } from "effect";
import type { Page } from "playwright";
import * as v from "valibot";
import { PlaywrightChromiumPageResource } from "../browser";
import { delay, issueToLogString } from "../util";

// Errors: search page
class GoToJobSearchPageError extends Data.TaggedError(
  "GoToJobSearchPageError",
)<{ readonly message: string }> {}
class SearchThenGotoJobListPageError extends Data.TaggedError(
  "SearchThenGotoJobListPageError",
)<{ readonly message: string }> {}
class JobSearchPageValidationError extends Data.TaggedError(
  "JobSearchPageValidationError",
)<{ readonly message: string }> {}
class FillWorkTypeError extends Data.TaggedError("FillWorkTypeError")<{
  readonly message: string;
}> {}
class FillPrefectureFieldError extends Data.TaggedError(
  "FillPrefectureFieldError",
)<{ readonly message: string }> {}
class FillOccupationFieldError extends Data.TaggedError(
  "FillOccupationFieldError",
)<{ readonly message: string }> {}
class EmploymentLabelToSelectorError extends Data.TaggedError(
  "EmploymentLabelToSelectorError",
)<{ readonly message: string }> {}
class EngineeringLabelSelectorError extends Data.TaggedError(
  "EngineeringLabelSelectorError",
)<{ readonly message: string }> {}
class FillJobPeriodError extends Data.TaggedError("FillJobPeriodError")<{
  readonly message: string;
}> {}
type JobSearchCriteriaFillFormError =
  | FillWorkTypeError
  | FillPrefectureFieldError
  | FillOccupationFieldError
  | FillJobPeriodError;

// Errors: list page
class ExtractJobNumbersError extends Data.TaggedError(
  "ExtractJobNumbersError",
)<{ readonly message: string }> {}
class NextJobListPageError extends Data.TaggedError("NextJobListPageError")<{
  readonly message: string;
}> {}
class JobListPageValidationError extends Data.TaggedError(
  "JobListPageValidationError",
)<{ readonly message: string }> {}
class ListJobsError extends Data.TaggedError("ListJobsError")<{
  readonly message: string;
}> {}
class IsNextPageEnabledError extends Data.TaggedError(
  "IsNextPageEnabledError",
)<{ readonly message: string }> {}
class JobNumberValidationError extends Data.TaggedError(
  "JobNumberValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> {}

// Errors: config
class ImportChromiumError extends Data.TaggedError("ImportChromiumError")<{
  readonly message: string;
}> {}
class GetExecutablePathError extends Data.TaggedError(
  "GetExecutablePathError",
)<{ readonly message: string }> {}

export type JobNumberCrawlerError =
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
  | JobNumberValidationError;

// Search page operations
function goToJobSearchPage(page: Page) {
  return Effect.tryPromise({
    try: async () => {
      await page.goto(
        "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010",
      );
    },
    catch: (e) =>
      new GoToJobSearchPageError({
        message: `unexpected error.\n${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() => {
      return Effect.logDebug("navigated to job search page.");
    }),
  );
}

function validateJobSearchPage(page: Page) {
  return Effect.gen(function* () {
    const url = page.url();
    if (!url.includes("kensaku"))
      yield* Effect.fail(
        new JobSearchPageValidationError({
          message: `not on job search page.\nurl=${url}`,
        }),
      );
    const jobSearchPage = yield* Effect.tryPromise({
      try: async () => {
        return page as JobSearchPage;
      },
      catch: (e) =>
        new JobSearchPageValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug("succeeded to validate job search page.");
      }),
    );
    return jobSearchPage;
  });
}

function searchThenGotoJobListPage(
  page: JobSearchPage,
  searchFilter: JobSearchCriteria,
) {
  return Effect.gen(function* () {
    yield* fillJobCriteriaField(page, searchFilter);
    yield* Effect.tryPromise({
      try: async () => {
        const searchBtn = page.locator("#ID_searchBtn");
        await Promise.all([
          page.waitForURL("**/kensaku/*.do"),
          searchBtn.click(),
        ]);
      },
      catch: (e) =>
        new SearchThenGotoJobListPageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(
          "navigated to job list page from job search page.",
        );
      }),
    );
  });
}

function fillJobCriteriaField(
  page: JobSearchPage,
  jobSearchCriteria: JobSearchCriteria,
) {
  const { employmentType, workLocation, desiredOccupation, searchPeriod } =
    jobSearchCriteria;
  return Effect.gen(function* () {
    if (employmentType) yield* fillWorkType(page, employmentType);
    if (workLocation) yield* fillPrefectureField(page, workLocation);
    if (desiredOccupation?.occupationSelection) {
      yield* fillOccupationField(page, desiredOccupation.occupationSelection);
    }
    if (searchPeriod) {
      yield* fillJobPeriod(page, searchPeriod);
    }
  }).pipe(
    Effect.tap(() => {
      return Effect.logDebug(
        `filled job criteria fields. criteria=${JSON.stringify(jobSearchCriteria, null, 2)}`,
      );
    }),
  );
}

function fillWorkType(page: JobSearchPage, employmentType: EmploymentType) {
  return Effect.gen(function* () {
    const selector = yield* employmentLabelToSelector(employmentType);
    yield* Effect.tryPromise({
      try: async () => {
        await page.locator(selector).check();
      },
      catch: (_e) =>
        new FillWorkTypeError({
          message: `Error: invalid employmentType: ${employmentType}`,
        }),
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(
          `filled work type field. employmentType=${employmentType}`,
        );
      }),
    );
  });
}

function fillPrefectureField(
  page: JobSearchPage,
  workLocation: DirtyWorkLocation,
) {
  const { prefecture } = workLocation;
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `fill PrefectureField.\nworkLocation: ${JSON.stringify(workLocation, null, 2)}`,
    );
    yield* Effect.tryPromise({
      try: async () => {
        const prefectureSelector = page.locator("#ID_tDFK1CmbBox");
        await prefectureSelector.selectOption(prefecture);
      },
      catch: (e) =>
        new FillPrefectureFieldError({
          message: `Error: workLocation=${workLocation} ${String(e)}`,
        }),
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(
          `filled prefecture field. prefecture=${prefecture}`,
        );
      }),
    );
  });
}

function fillOccupationField(page: JobSearchPage, label: EngineeringLabel) {
  return Effect.gen(function* () {
    const selector = yield* engineeringLabelToSelector(label);
    yield* Effect.logDebug(
      `will execute fillOccupationField\nlabel=${label}\nselector=${JSON.stringify(selector, null, 2)}`,
    );
    yield* Effect.tryPromise({
      try: async () => {
        const firstoccupationSelectionBtn = page
          .locator("#ID_Btn", { hasText: /職種を選択/ })
          .first();
        await firstoccupationSelectionBtn.click();
        const openerSibling = page.locator(selector.openerSibling);
        const opener = openerSibling.locator("..").locator("i.one_i");
        await opener.click();
        const radioBtn = page.locator(selector.radioBtn);
        await radioBtn.click();
        const okBtn = page.locator("#ID_ok3");
        await okBtn.click();
      },
      catch: (e) =>
        new FillOccupationFieldError({
          message: `unexpected Error. label=${label}\n${String(e)}`,
        }),
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(`filled occupation field. label=${label}`);
      }),
    );
  });
}

function fillJobPeriod(page: JobSearchPage, searchPeriod: SearchPeriod) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(`fillJobPeriod: searchPeriod=${searchPeriod}`);
    const id =
      searchPeriod === "today"
        ? "#ID_newArrivedCKBox1"
        : searchPeriod === "week"
          ? "#ID_newArrivedCKBox2"
          : null;
    id &&
      (yield* Effect.tryPromise({
        try: async () => {
          const locator = page.locator(id);
          locator.check();
        },
        catch: (e) =>
          new FillJobPeriodError({
            message: `Error: searchPeriod=${searchPeriod} ${String(e)}`,
          }),
      }));
  }).pipe(
    Effect.tap(() => {
      return Effect.logDebug(
        `filled job period field. searchPeriod=${searchPeriod}`,
      );
    }),
  );
}

function engineeringLabelToSelector(
  label: EngineeringLabel,
): Effect.Effect<
  EngineeringLabelSelector,
  EngineeringLabelSelectorError,
  never
> {
  switch (label) {
    case "ソフトウェア開発技術者、プログラマー":
      return Effect.succeed({
        radioBtn: "#ID_skCheck094" as EngineeringLabelSelectorRadioBtn,
        openerSibling: "#ID_skHid09" as EngineeringLabelSelectorOpenerSibling,
      });
    default:
      return Effect.fail(
        new EngineeringLabelSelectorError({
          message: `Error: invalid label=${label}`,
        }),
      );
  }
}

function employmentLabelToSelector(employmentType: EmploymentType) {
  switch (employmentType) {
    case "PartTimeWorker":
      return Effect.succeed("#ID_LippanCKBox2" as EmploymentTypeSelector);
    case "RegularEmployee":
      return Effect.succeed("#ID_LippanCKBox1" as EmploymentTypeSelector);
    default:
      return Effect.fail(
        new EmploymentLabelToSelectorError({
          message: `unknown label: ${employmentType}`,
        }),
      );
  }
}

// List page operations
function validateJobListPage(page: Page) {
  return Effect.tryPromise({
    try: async () => {
      return page.locator(".kyujin").count();
    },
    catch: (e) =>
      new JobListPageValidationError({
        message: `unexpected error. ${String(e)}`,
      }),
  })
    .pipe(
      Effect.flatMap((pageCount) =>
        pageCount === 0
          ? Effect.fail(
              new JobListPageValidationError({
                message: "job list is empty. maybe job not found.",
              }),
            )
          : Effect.succeed(page as JobListPage),
      ),
    )
    .pipe(
      Effect.tap((_) => {
        return Effect.logDebug("succeeded to validate job list page.");
      }),
    );
}

function extractJobNumbers(jobOverviewList: JobOverViewList) {
  return Effect.forEach(jobOverviewList, (table) => {
    return Effect.gen(function* () {
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
          new ExtractJobNumbersError({
            message: `unexpected error. ${String(e)}`,
          }),
      }).pipe(
        Effect.tap((raw) => {
          if (raw === null) {
            return Effect.logDebug("Warning: jobNumber textContent is null");
          }
          return Effect.logDebug(`rawJobNumber=${raw}`);
        }),
      );
      if (rawJobNumber === null) {
        return yield* Effect.fail(
          new ExtractJobNumbersError({ message: "jobNumber is null" }),
        );
      }
      const trimedRawJobNumber = rawJobNumber.trim();
      const jobNumber = yield* validateJobNumber(trimedRawJobNumber);
      return jobNumber;
    });
  });
}

function goToNextJobListPage(page: JobListPage) {
  return Effect.tryPromise({
    try: async () => {
      const nextButton = page.locator('input[value="次へ＞"]').first();
      await nextButton.click();
      return page;
    },
    catch: (e) =>
      new NextJobListPageError({
        message: `unexpected error.\n${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() => {
      return Effect.logDebug("navigated to next job list page.");
    }),
  );
}

function listJobOverviewElem(
  jobListPage: JobListPage,
): Effect.Effect<JobOverViewList, ListJobsError, never> {
  return Effect.tryPromise({
    try: () => jobListPage.locator("table.kyujin.mt1.noborder").all(),
    catch: (e) =>
      new ListJobsError({ message: `unexpected error.\n${String(e)}` }),
  })
    .pipe(
      Effect.flatMap((tables) =>
        tables.length === 0
          ? Effect.fail(new ListJobsError({ message: "jobOverList is empty." }))
          : Effect.succeed(tables as JobOverViewList),
      ),
    )
    .pipe(
      Effect.tap((jobOverViewList) => {
        return Effect.logDebug(
          `succeeded to list job overview elements. count=${jobOverViewList.length}`,
        );
      }),
    );
}

function isNextPageEnabled(page: JobListPage) {
  return Effect.tryPromise({
    try: async () => {
      const nextPageBtn = page.locator('input[value="次へ＞"]').first();
      return !(await nextPageBtn.isDisabled());
    },
    catch: (e) => {
      console.error(e);
      return new IsNextPageEnabledError({
        message: `unexpected error. ${String(e)}`,
      });
    },
  }).pipe(
    Effect.tap((enabled) => {
      return Effect.logDebug(`is next page enabled: ${enabled}`);
    }),
  );
}

function validateJobNumber(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateJobNumber. args={val:${JSON.stringify(val, null, 2)}}`,
    );
    const result = v.safeParse(jobNumberSchema, val);
    if (!result.success) {
      yield* Effect.logDebug(
        `succeeded to validate jobNumber. val=${JSON.stringify(
          result.output,
          null,
          2,
        )}`,
      );
      return yield* Effect.fail(
        new JobNumberValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

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

// Pagination helper
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
            nextPageDelayMs,
          })
        : Option.none(),
    ] as const;
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
      const pageResource = yield* PlaywrightChromiumPageResource;
      const { page } = pageResource;
      return {
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
      };
    }),
    dependencies: [
      JobNumberCrawlerConfig.Default,
      PlaywrightChromiumPageResource.Default,
    ],
  },
) {}
