import type {
  InsertJobRequestBody,
  JobNumber,
  transformedSchema,
} from "@sho/models";
import {
  transformedEmployeeCountSchema,
  transformedHomePageSchema,
  transformedWageSchema,
  transformedWorkingHoursSchema,
} from "@sho/models";
import { format } from "date-fns";
import { Config, Data, Effect } from "effect";
import { parseHTML } from "linkedom";
import type { InferOutput } from "valibot";
import { safeParse } from "valibot";
import { PlaywrightChromiumPageResource } from "../browser";
import { goToSingleJobDetailPage } from "../core/page/JobList/navigations";
import { validateJobListPage } from "../core/page/JobList/validators";
import {
  goToJobSearchPage,
  searchNoThenGotoSingleJobListPage,
} from "../core/page/JobSearch/navigations";
import { validateJobSearchPage } from "../core/page/JobSearch/validators";
import { validateJobNumber } from "../core/page/others";
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

// ============================================================
// Transformer Helpers
// ============================================================

const toTransformedWage = (val: unknown) => {
  const result = safeParse(transformedWageSchema, val);
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
  const result = safeParse(transformedWorkingHoursSchema, val);
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
  const result = safeParse(transformedEmployeeCountSchema, val);
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
  const result = safeParse(transformedHomePageSchema, val);
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
