import type {
  InsertJobRequestBody,
  JobListPage,
  JobNumber,
  JobOverViewList,
  JobSearchPage,
  transformedSchema,
} from "@sho/models";
import {
  jobNumberSchema,
  transformedEmployeeCountSchema,
  transformedHomePageSchema,
  transformedWageSchema,
  transformedWorkingHoursSchema,
} from "@sho/models";
import { format } from "date-fns";
import { Config, Data, Effect } from "effect";
import { parseHTML } from "linkedom";
import type { Page } from "playwright";
import type { InferOutput } from "valibot";
import * as v from "valibot";
import { PlaywrightChromiumPageResource } from "../browser";
import {
  transformExpiryDate,
  transformReceivedDate,
} from "../jobDetail/helpers/transformers";
import {
  validateCompanyName,
  validateEmploymentType,
  validateJobDescription,
  validateJobDetailPage,
  validateOccupation,
  validateQualification,
  validateWorkPlace,
} from "../jobDetail/helpers/validators";
import { JobNumberValidationError } from "../jobDetail/helpers/validators/error";
import { issueToLogString } from "../util";

// ============================================================
// Errors
// ============================================================

export class ExtractJobDetailRawHtmlError extends Data.TaggedError(
  "ExtractJobDetailRawHtmlError",
)<{
  readonly jobNumber: string;
  readonly currentUrl: string;
  readonly reason: string;
}> {}

export class WageTransformationError extends Data.TaggedError(
  "WageTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

export class WorkingHoursTransformationError extends Data.TaggedError(
  "WorkingHoursTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

export class EmployeeCountTransformationError extends Data.TaggedError(
  "EmployeeCountTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

export class HomePageTransformationError extends Data.TaggedError(
  "HomePageTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly reason: string;
  readonly serializedPayload: string;
  readonly responseStatus?: number;
  readonly responseStatusMessage?: string;
}> {}

class GoToJobSearchPageError extends Data.TaggedError(
  "GoToJobSearchPageError",
)<{ readonly message: string }> {}

class JobSearchPageValidationError extends Data.TaggedError(
  "JobSearchPageValidationError",
)<{ readonly message: string }> {}

class SearchThenGotoFirstJobListPageError extends Data.TaggedError(
  "SearchThenGotoFirstJobListPageError",
)<{ readonly message: string }> {}

class FillJobNumberError extends Data.TaggedError("FillJobNumberError")<{
  readonly message: string;
}> {}

class JobListPageValidationError extends Data.TaggedError(
  "JobListPageValidationError",
)<{ readonly message: string }> {}

class FromJobListToJobDetailPageError extends Data.TaggedError(
  "FromJobListToJobDetailPageError",
)<{ readonly message: string }> {}

class AssertSingleJobListedError extends Data.TaggedError(
  "AssertSingleJobListedError",
)<{ readonly message: string }> {}

class ListJobsError extends Data.TaggedError("ListJobsError")<{
  readonly message: string;
}> {}

// ============================================================
// Page Operations (inlined from core/page/)
// ============================================================

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

function fillJobNumber(page: JobSearchPage, jobNumber: JobNumber) {
  return Effect.tryPromise({
    try: async () => {
      const jobNumberSplits = jobNumber.split("-");
      const firstJobNumber = jobNumberSplits.at(0);
      const secondJobNumber = jobNumberSplits.at(1);
      if (!firstJobNumber)
        throw new FillJobNumberError({
          message: `firstJobnumber undefined. jobNumber=${jobNumber}`,
        });
      if (!secondJobNumber)
        throw new FillJobNumberError({
          message: `secondJobNumber undefined. jobNumber=${jobNumber}`,
        });
      const firstJobNumberInput = page.locator("#ID_kJNoJo1");
      const secondJobNumberInput = page.locator("#ID_kJNoGe1");
      await firstJobNumberInput.fill(firstJobNumber);
      await secondJobNumberInput.fill(secondJobNumber);
    },
    catch: (e) =>
      new FillJobNumberError({
        message: `unexpected error.\njobNumber=${jobNumber}\n${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() => {
      return Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`);
    }),
  );
}

function searchNoThenGotoSingleJobListPage(
  page: JobSearchPage,
  jobNumber: JobNumber,
) {
  return Effect.gen(function* () {
    yield* fillJobNumber(page, jobNumber);
    yield* Effect.tryPromise({
      try: async () => {
        const searchNoBtn = page.locator("#ID_searchNoBtn");
        await Promise.all([
          page.waitForURL("**/kensaku/*.do"),
          searchNoBtn.click(),
        ]);
      },
      catch: (e) =>
        new SearchThenGotoFirstJobListPageError({
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
          ? Effect.fail(
              new ListJobsError({ message: "jobOverList is empty." }),
            )
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

function assertSingleJobListed(page: JobListPage) {
  return Effect.gen(function* () {
    const jobOverViewList = yield* listJobOverviewElem(page);
    if (jobOverViewList.length !== 1) {
      yield* Effect.logDebug(
        `failed to assert single job listed. job count=${jobOverViewList.length}`,
      );
      return yield* Effect.fail(
        new AssertSingleJobListedError({
          message: `job list count should be 1 but ${jobOverViewList.length}`,
        }),
      );
    }
  });
}

function goToSingleJobDetailPage(page: JobListPage) {
  return Effect.gen(function* () {
    yield* assertSingleJobListed(page);
    yield* Effect.tryPromise({
      try: async () => {
        const showDetailBtn = page.locator("#ID_dispDetailBtn").first();
        showDetailBtn.evaluate((elm) => elm.removeAttribute("target"));
        await showDetailBtn.click();
      },
      catch: (e) =>
        new FromJobListToJobDetailPageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(
          "navigated to job detail page from job list page.",
        );
      }),
    );
    return page;
  });
}

function validateJobNumber(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateJobNumber. args={val:${JSON.stringify(val, null, 2)}}`,
    );
    const result = v.safeParse(jobNumberSchema, val);
    if (!result.success) {
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

// ============================================================
// Transformer Helpers
// ============================================================

const toTransformedWage = (val: unknown) => {
  const result = v.safeParse(transformedWageSchema, val);
  if (!result.success) {
    return Effect.fail(
      new WageTransformationError({
        reason: ` ${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

const toTransformedWorkingHours = (val: unknown) => {
  const result = v.safeParse(transformedWorkingHoursSchema, val);
  if (!result.success) {
    return Effect.fail(
      new WorkingHoursTransformationError({
        reason: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

const toTransformedEmployeeCount = (val: unknown) => {
  const result = v.safeParse(transformedEmployeeCountSchema, val);
  if (!result.success) {
    return Effect.fail(
      new EmployeeCountTransformationError({
        reason: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

const toTransformedHomePage = (val: unknown) => {
  const result = v.safeParse(transformedHomePageSchema, val);
  if (!result.success) {
    return Effect.fail(
      new HomePageTransformationError({
        reason: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

// ============================================================
// Loader Helper
// ============================================================

function buildJobStoreClient() {
  return Effect.gen(function* () {
    const endpoint = yield* Config.string("JOB_STORE_ENDPOINT");
    return {
      insertJob: (job: InsertJobRequestBody) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            `executing insert job api. job=${JSON.stringify(job, null, 2)}`,
          );
          const res = yield* Effect.tryPromise({
            try: async () =>
              fetch(`${endpoint}/job`, {
                method: "POST",
                body: JSON.stringify(job),
                headers: {
                  "content-type": "application/json",
                  "x-api-key": process.env.API_KEY ?? "",
                },
              }),
            catch: (e) =>
              new InsertJobError({
                reason: `${e instanceof Error ? e.message : String(e)}`,
                serializedPayload: JSON.stringify(job, null, 2),
              }),
          });
          const data = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (e) =>
              new InsertJobError({
                reason: `${e instanceof Error ? e.message : String(e)}`,
                serializedPayload: JSON.stringify(job, null, 2),
                responseStatus: res.status,
                responseStatusMessage: res.statusText,
              }),
          });
          yield* Effect.logDebug(
            `response data. ${JSON.stringify(data, null, 2)}`,
          );
        }),
    };
  });
}

// ============================================================
// ISODateString helper
// ============================================================

const i = Symbol();
type ISODateString = string & { [i]: never };

const nowISODateString = (): ISODateString =>
  format(new Date(), "yyyy-MM-dd") as ISODateString;

// ============================================================
// Extractor Service
// ============================================================

export class JobDetailExtractor extends Effect.Service<JobDetailExtractor>()(
  "JobDetailExtractor",
  {
    effect: Effect.gen(function* () {
      const pageResource = yield* PlaywrightChromiumPageResource;
      const extractRawHtml = Effect.fn("extractRawHtml")(function* (
        jobNumber: JobNumber,
      ) {
        const { page } = pageResource;
        yield* Effect.logInfo("start extracting raw job detail HTML...");
        yield* Effect.logDebug("go to hello work search page.");
        yield* goToJobSearchPage(page);
        const searchPage = yield* validateJobSearchPage(page);
        yield* Effect.logDebug(
          "fill jobNumber then go to hello work search page.",
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
      });
      return { extractRawHtml };
    }),
    dependencies: [PlaywrightChromiumPageResource.Default],
  },
) {}

// ============================================================
// Transformer Service
// ============================================================

export class JobDetailTransformer extends Effect.Service<JobDetailTransformer>()(
  "JobDetailTransformer",
  {
    effect: Effect.gen(function* () {
      return {
        transform: (rawHtml: string) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start transforming job detail...");
            const { document } = parseHTML(rawHtml);
            const rawJobNumber =
              document.querySelector("#ID_kjNo")?.textContent;
            const jobNumber = yield* validateJobNumber(rawJobNumber);
            const rawCompanyName =
              document.querySelector("#ID_jgshMei")?.textContent;
            const companyName = yield* validateCompanyName(rawCompanyName);
            const rawReceivedDate =
              document.querySelector("#ID_uktkYmd")?.textContent;
            const receivedDate = yield* transformReceivedDate(rawReceivedDate);
            const rawExpiryDate =
              document.querySelector("#ID_shkiKigenHi")?.textContent;
            const expiryDate = yield* transformExpiryDate(rawExpiryDate);
            const rawHomePage = document.querySelector("#ID_hp")?.textContent;
            const homePage = rawHomePage
              ? yield* toTransformedHomePage(rawHomePage)
              : undefined;
            const rawOccupation =
              document.querySelector("#ID_sksu")?.textContent;
            const occupation = yield* validateOccupation(rawOccupation);
            const rawEmplomentType =
              document.querySelector("#ID_koyoKeitai")?.textContent;
            const employmentType =
              yield* validateEmploymentType(rawEmplomentType);
            const rawWage = document.querySelector("#ID_chgn")?.textContent;
            const { wageMax, wageMin } = yield* toTransformedWage(rawWage);
            const rawWorkingHours =
              document.querySelector("#ID_shgJn1")?.textContent;
            const { workingEndTime, workingStartTime } =
              yield* toTransformedWorkingHours(rawWorkingHours);
            const rawEmployeeCount = document.querySelector(
              "#ID_jgisKigyoZentai",
            )?.textContent;
            const employeeCount =
              yield* toTransformedEmployeeCount(rawEmployeeCount);
            const rawWorkPlace =
              document.querySelector("#ID_shgBsJusho")?.textContent;
            const workPlace = yield* validateWorkPlace(rawWorkPlace);
            const rawJobDescription =
              document.querySelector("#ID_shigotoNy")?.textContent;
            const jobDescription =
              yield* validateJobDescription(rawJobDescription);
            const rawQualifications =
              document.querySelector("#ID_hynaMenkyoSkku")?.textContent;
            const qualifications =
              yield* validateQualification(rawQualifications);
            return {
              jobNumber,
              companyName,
              receivedDate,
              expiryDate,
              homePage,
              occupation,
              employmentType,
              wageMax,
              wageMin,
              workingEndTime,
              workingStartTime,
              employeeCount,
              workPlace,
              jobDescription,
              qualifications,
            };
          }),
      };
    }),
  },
) {}

// ============================================================
// Loader Service
// ============================================================

export class JobDetailLoader extends Effect.Service<JobDetailLoader>()(
  "JobDetailLoader",
  {
    effect: Effect.gen(function* () {
      return {
        load: (data: InferOutput<typeof transformedSchema>) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start loading job detail...");
            const client = yield* buildJobStoreClient();
            yield* client.insertJob(data);
          }),
      };
    }),
  },
) {}

// ============================================================
// Crawler Service (E + T + L)
// ============================================================

export class JobDetailCrawler extends Effect.Service<JobDetailCrawler>()(
  "JobDetailCrawler",
  {
    effect: Effect.gen(function* () {
      const extractor = yield* JobDetailExtractor;
      const transformer = yield* JobDetailTransformer;
      const loader = yield* JobDetailLoader;
      return {
        processJob: (jobNumber: JobNumber) =>
          Effect.gen(function* () {
            const { rawHtml } = yield* extractor.extractRawHtml(jobNumber);
            const transformed = yield* transformer.transform(rawHtml);
            yield* loader.load(transformed);
            return transformed;
          }),
      };
    }),
    dependencies: [
      JobDetailExtractor.Default,
      JobDetailTransformer.Default,
      JobDetailLoader.Default,
    ],
  },
) {}
