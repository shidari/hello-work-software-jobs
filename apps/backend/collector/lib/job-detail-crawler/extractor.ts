import type { JobNumber } from "@sho/models";
import { format } from "date-fns";
import { Data, Effect, Schema } from "effect";
import type { Page } from "../browser";
import {
  type FirstJobListPage,
  type JobDetailPage,
  navigateByJobNumber,
  openJobSearchPage,
} from "../page";

// ── RawJob スキーマ: DOM から抽出した生テキスト ──

export const RawJob = Schema.Struct({
  jobNumber: Schema.NullOr(Schema.String),
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.NullOr(Schema.String),
  expiryDate: Schema.NullOr(Schema.String),
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.NullOr(Schema.String),
  employmentType: Schema.NullOr(Schema.String),
  wage: Schema.NullOr(Schema.String),
  workingHours: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.String),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
});
export type RawJob = typeof RawJob.Type;

// ── エラー ──

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

// ── DOM セレクタマップ ──

const jobDetailSelectors = {
  jobNumber: "#ID_kjNo",
  companyName: "#ID_jgshMei",
  receivedDate: "#ID_uktkYmd",
  expiryDate: "#ID_shkiKigenHi",
  homePage: "#ID_hp",
  occupation: "#ID_sksu",
  employmentType: "#ID_koyoKeitai",
  wage: "#ID_chgn",
  workingHours: "#ID_shgJn1",
  employeeCount: "#ID_jgisKigyoZentai",
  workPlace: "#ID_shgBsJusho",
  jobDescription: "#ID_shigotoNy",
  qualifications: "#ID_hynaMenkyoSkku",
} as const;

// ── DOM → RawJob 抽出 ──

export function extractRawFieldsFromDocument(document: Document): RawJob {
  return {
    jobNumber:
      document
        .querySelector(jobDetailSelectors.jobNumber)
        ?.textContent?.trim() || null,
    companyName:
      document
        .querySelector(jobDetailSelectors.companyName)
        ?.textContent?.trim() || null,
    receivedDate:
      document
        .querySelector(jobDetailSelectors.receivedDate)
        ?.textContent?.trim() || null,
    expiryDate:
      document
        .querySelector(jobDetailSelectors.expiryDate)
        ?.textContent?.trim() || null,
    homePage:
      document
        .querySelector(jobDetailSelectors.homePage)
        ?.textContent?.trim() || null,
    occupation:
      document
        .querySelector(jobDetailSelectors.occupation)
        ?.textContent?.trim() || null,
    employmentType:
      document
        .querySelector(jobDetailSelectors.employmentType)
        ?.textContent?.trim() || null,
    wage:
      document.querySelector(jobDetailSelectors.wage)?.textContent?.trim() ||
      null,
    workingHours:
      document
        .querySelector(jobDetailSelectors.workingHours)
        ?.textContent?.trim() || null,
    employeeCount:
      document
        .querySelector(jobDetailSelectors.employeeCount)
        ?.textContent?.trim() || null,
    workPlace:
      document
        .querySelector(jobDetailSelectors.workPlace)
        ?.textContent?.trim() || null,
    jobDescription:
      document
        .querySelector(jobDetailSelectors.jobDescription)
        ?.textContent?.trim() || null,
    qualifications:
      document
        .querySelector(jobDetailSelectors.qualifications)
        ?.textContent?.trim() || null,
  };
}

// ── ページ操作ヘルパー ──

function listJobOverviewElem(page: FirstJobListPage) {
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

function assertSingleJobListed(page: FirstJobListPage) {
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

function goToSingleJobDetailPage(page: FirstJobListPage) {
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
    const _page: Page = page;
    return _page as JobDetailPage;
  });
}

function validateJobDetailPage(page: JobDetailPage) {
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
      return yield* new JobDetailPageValidationError({
        reason: `textContent of div.page_title should be 求人情報 but got: "${jobTitle}"`,
        currentUrl: page.url(),
      });
    return page;
  });
}

// ── ISODateString ヘルパー ──

const i = Symbol();
type ISODateString = string & { [i]: never };

const nowISODateString = (): ISODateString =>
  format(new Date(), "yyyy-MM-dd") as ISODateString;

// ── Extractor サービス ──

export class JobDetailExtractor extends Effect.Service<JobDetailExtractor>()(
  "JobDetailExtractor",
  {
    effect: Effect.gen(function* () {
      const jobSearchPage = yield* openJobSearchPage();
      const extractRawHtml = Effect.fn("extractRawHtml")(function* (
        jobNumber: JobNumber,
      ) {
        yield* Effect.logInfo("start extracting raw job detail HTML...");
        const firstJobListPage = yield* navigateByJobNumber(
          jobSearchPage,
          jobNumber,
        );
        yield* Effect.logDebug("now on job List page.");
        const jobDetailPage = yield* goToSingleJobDetailPage(firstJobListPage);
        yield* validateJobDetailPage(jobDetailPage);
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
      return {
        extractRawHtml: (jobNumber: JobNumber) => extractRawHtml(jobNumber),
      };
    }),
  },
) {}
