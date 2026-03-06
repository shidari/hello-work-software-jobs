import type { JobNumber } from "@sho/models";
import { format } from "date-fns";
import { Data, Effect, Schema } from "effect";
import type { Page } from "../browser";
import { FirstJobListPageNavigator } from "../page";

// ── RawJob スキーマ: DOM から抽出した生テキスト ──

export const RawJob = Schema.Struct({
  jobNumber: Schema.optional(Schema.String),
  companyName: Schema.optional(Schema.String),
  receivedDate: Schema.optional(Schema.String),
  expiryDate: Schema.optional(Schema.String),
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.optional(Schema.String),
  employmentType: Schema.optional(Schema.String),
  wage: Schema.optional(Schema.String),
  workingHours: Schema.optional(Schema.String),
  employeeCount: Schema.optional(Schema.String),
  workPlace: Schema.optional(Schema.String),
  jobDescription: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
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
  const text = (selector: string) =>
    document.querySelector(selector)?.textContent?.trim() || undefined;

  return {
    jobNumber: text(jobDetailSelectors.jobNumber),
    companyName: text(jobDetailSelectors.companyName),
    receivedDate: text(jobDetailSelectors.receivedDate),
    expiryDate: text(jobDetailSelectors.expiryDate),
    homePage: text(jobDetailSelectors.homePage) || null,
    occupation: text(jobDetailSelectors.occupation),
    employmentType: text(jobDetailSelectors.employmentType),
    wage: text(jobDetailSelectors.wage),
    workingHours: text(jobDetailSelectors.workingHours),
    employeeCount: text(jobDetailSelectors.employeeCount),
    workPlace: text(jobDetailSelectors.workPlace),
    jobDescription: text(jobDetailSelectors.jobDescription),
    qualifications: text(jobDetailSelectors.qualifications),
  };
}

// ── ページ操作ヘルパー ──

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
