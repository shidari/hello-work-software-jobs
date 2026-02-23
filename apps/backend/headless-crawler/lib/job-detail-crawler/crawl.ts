import { format } from "date-fns";
import { Config, Data, Effect, Either, Schema } from "effect";
import { parseHTML } from "linkedom";
import type { Page } from "playwright";
import { FirstJobListPageNavigator } from "../page";
import {
  extractRawFieldsFromDocument,
  type JobNumber,
  RawJobToDomainJob,
  type TransformedJob,
} from "../schemas";
import { formatParseError } from "../util";

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

export class JobDetailTransformError extends Data.TaggedError(
  "JobDetailTransformError",
)<{
  readonly reason: string;
  readonly rawFields: string;
}> {}

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
// Loader Helper
// ============================================================

function buildJobStoreClient() {
  return Effect.gen(function* () {
    const endpoint = yield* Config.string("JOB_STORE_ENDPOINT");
    return {
      insertJob: (job: TransformedJob) =>
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

            // Stage 1: DOM → Raw
            const rawFields = extractRawFieldsFromDocument(document);

            // Stage 2: Raw → Domain
            const result =
              Schema.decodeUnknownEither(RawJobToDomainJob)(rawFields);
            if (Either.isLeft(result)) {
              return yield* Effect.fail(
                new JobDetailTransformError({
                  reason: formatParseError(result.left),
                  rawFields: JSON.stringify(rawFields, null, 2),
                }),
              );
            }
            return result.right;
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
        load: (data: TransformedJob) =>
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
