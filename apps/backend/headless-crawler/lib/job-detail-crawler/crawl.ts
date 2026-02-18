import type { JobNumber } from "../schemas";
import {
  companyNameSchema,
  employmentTypeSchema,
  jobDescriptionSchema,
  jobNumberSchema,
  occupationSchema,
  qualificationsSchema,
  transformedEmployeeCountSchema,
  transformedExpiryDateToISOStrSchema,
  transformedHomePageSchema,
  transformedReceivedDateToISOStrSchema,
  type transformedSchema,
  transformedWageSchema,
  transformedWorkingHoursSchema,
  workPlaceSchema,
} from "../schemas";
import { format } from "date-fns";
import { Config, Data, Effect } from "effect";
import { parseHTML } from "linkedom";
import type { Page } from "playwright";
import type { InferOutput } from "valibot";
import * as v from "valibot";
import { FirstJobListPageNavigator } from "../page";
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

class FromJobListToJobDetailPageError extends Data.TaggedError(
  "FromJobListToJobDetailPageError",
)<{ readonly message: string }> {}

class AssertSingleJobListedError extends Data.TaggedError(
  "AssertSingleJobListedError",
)<{ readonly message: string }> {}

class ListJobsError extends Data.TaggedError("ListJobsError")<{
  readonly message: string;
}> {}

class JobDetailPageValidationError extends Data.TaggedError(
  "JobDetailPageValidationError",
)<{ readonly reason: string; readonly currentUrl: string }> {}

class JobNumberValidationError extends Data.TaggedError(
  "JobNumberValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class CompanyNameValidationError extends Data.TaggedError(
  "CompanyNameValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class OccupationValidationError extends Data.TaggedError(
  "OccupationValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class EmploymentTypeValidationError extends Data.TaggedError(
  "EmploymentTypeValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class WorkPlaceValidationError extends Data.TaggedError(
  "WorkPlaceValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class JobDescriptionValidationError extends Data.TaggedError(
  "JobDescriptionValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class QualificationValidationError extends Data.TaggedError(
  "QualificationValidationError",
)<{ readonly detail: string; readonly serializedVal: string }> {}

class ReceivedDateTransformationError extends Data.TaggedError(
  "ReceivedDateTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

class ExpiryDateTransformationError extends Data.TaggedError(
  "ExpiryDateTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

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

// ============================================================
// Page Operations
// ============================================================

function listJobOverviewElem(page: Page) {
  return Effect.tryPromise({
    try: () => page.locator("table.kyujin.mt1.noborder").all(),
    catch: (e) =>
      new ListJobsError({ message: `unexpected error.\n${String(e)}` }),
  })
    .pipe(
      Effect.flatMap((tables) =>
        tables.length === 0
          ? Effect.fail(new ListJobsError({ message: "jobOverList is empty." }))
          : Effect.succeed(tables),
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

function assertSingleJobListed(page: Page) {
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

function goToSingleJobDetailPage(page: Page) {
  return Effect.gen(function* () {
    yield* assertSingleJobListed(page);
    yield* Effect.tryPromise({
      try: async () => {
        const showDetailBtn = page.locator("#ID_dispDetailBtn").first();
        showDetailBtn.evaluate((elm: Element) => elm.removeAttribute("target"));
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

function validateJobDetailPage(page: Page) {
  return Effect.gen(function* () {
    const jobTitle = yield* Effect.tryPromise({
      try: async () => {
        const jobTitle = await page.locator("div.page_title").textContent();
        return jobTitle;
      },
      catch: (e) =>
        new JobDetailPageValidationError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
        }),
    }).pipe(
      Effect.tap((jobTitle) => {
        return Effect.logDebug(`extracted job title: ${jobTitle}`);
      }),
    );
    if (jobTitle !== "求人情報")
      throw new JobDetailPageValidationError({
        reason: `textContent of div.page_title should be 求人情報 but got: "${jobTitle}"`,
        currentUrl: page.url(),
      });
    return page;
  });
}

// ============================================================
// Validators
// ============================================================

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

function validateCompanyName(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(companyNameSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new CompanyNameValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
        }),
      ).pipe(
        Effect.tap(() => {
          return Effect.logDebug(
            `failed to validate companyName. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

function validateOccupation(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateOccupation. args=${JSON.stringify(val, null, 2)}`,
    );
    const result = v.safeParse(occupationSchema, val);
    if (!result.success) {
      yield* Effect.logDebug(
        `failed to validate occupation. issues=${JSON.stringify(result.issues, null, 2)}`,
      );
      return yield* Effect.fail(
        new OccupationValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
        }),
      );
    }
    yield* Effect.logDebug(
      `succeeded to validate occupation. val=${JSON.stringify(result.output, null, 2)}`,
    );
    return yield* Effect.succeed(result.output);
  });
}

function validateEmploymentType(val: unknown) {
  return Effect.try({
    try: () => v.parse(employmentTypeSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new EmploymentTypeValidationError({
            detail: e.message,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new EmploymentTypeValidationError({
            detail: `unexpected error.\n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
          }),
  });
}

function validateWorkPlace(val: unknown) {
  return Effect.try({
    try: () => v.parse(workPlaceSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new WorkPlaceValidationError({
            detail: `${e.issues.map(issueToLogString).join("\n")}`,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new WorkPlaceValidationError({
            detail: `unexpected error. \n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
          }),
  }).pipe(
    Effect.tap((workPlace) => {
      return Effect.logDebug(
        `succeeded to validate workPlace. val=${JSON.stringify(workPlace, null, 2)}`,
      );
    }),
  );
}

function validateJobDescription(val: unknown) {
  return Effect.try({
    try: () => v.parse(jobDescriptionSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new JobDescriptionValidationError({
            detail: `${e.issues.map(issueToLogString).join("\n")}`,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new JobDescriptionValidationError({
            detail: `unexpected error.\n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
          }),
  }).pipe(
    Effect.tap((jobDescription) => {
      return Effect.logDebug(
        `succeeded to validate jobDescription. val=${JSON.stringify(jobDescription, null, 2)}`,
      );
    }),
  );
}

function validateQualification(
  val: unknown,
): Effect.Effect<
  v.InferOutput<typeof qualificationsSchema>,
  QualificationValidationError
> {
  const result = v.safeParse(qualificationsSchema, val);
  if (!result.success) {
    return Effect.fail(
      new QualificationValidationError({
        detail: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
}

// ============================================================
// Transformers
// ============================================================

function transformReceivedDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(transformedReceivedDateToISOStrSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ReceivedDateTransformationError({
          reason: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

function transformExpiryDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(transformedExpiryDateToISOStrSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ExpiryDateTransformationError({
          reason: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

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
      insertJob: (job: InferOutput<typeof transformedSchema>) =>
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
      const firstJobListPage = yield* FirstJobListPageNavigator;
      const extractRawHtml = Effect.fn("extractRawHtml")(function* (
        jobNumber: JobNumber,
      ) {
        yield* Effect.logInfo("start extracting raw job detail HTML...");
        const page = yield* firstJobListPage.byJobNumber(jobNumber);
        yield* Effect.logDebug("now on job List page.");
        yield* goToSingleJobDetailPage(page);
        const jobDetailPage = yield* validateJobDetailPage(page);
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
    dependencies: [FirstJobListPageNavigator.Default],
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
