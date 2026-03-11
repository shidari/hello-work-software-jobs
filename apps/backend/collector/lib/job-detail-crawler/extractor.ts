import type { JobNumber } from "@sho/models";
import { format } from "date-fns";
import { Data, Effect, Schema } from "effect";
import type { Page } from "../browser";
import {
  type JobDetailPage,
  type JobListPage,
  navigateSearchToJobListByJobNumber,
  openJobSearchPage,
} from "../page";

// ── RawJob スキーマ: DOM から抽出した生テキスト ──

export const RawJob = Schema.Struct({
  jobNumber: Schema.optional(Schema.String),
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.optional(Schema.String),
  expiryDate: Schema.optional(Schema.String),
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.optional(Schema.String),
  employmentType: Schema.optional(Schema.String),
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

// ── DOM → RawJob 抽出 ──

export function extractRawFieldsFromDocument(document: Document): RawJob {
  return {
    jobNumber:
      document.querySelector("#ID_kjNo")?.textContent?.trim() || undefined,
    companyName:
      document.querySelector("#ID_jgshMei")?.textContent?.trim() ?? null,
    receivedDate:
      document.querySelector("#ID_uktkYmd")?.textContent?.trim() || undefined,
    expiryDate:
      document.querySelector("#ID_shkiKigenHi")?.textContent?.trim() ||
      undefined,
    homePage: document.querySelector("#ID_hp")?.textContent?.trim() || null,
    occupation:
      document.querySelector("#ID_sksu")?.textContent?.trim() || undefined,
    employmentType:
      document.querySelector("#ID_koyoKeitai")?.textContent?.trim() ||
      undefined,
    wage: document.querySelector("#ID_chgn")?.textContent?.trim() ?? null,
    workingHours:
      document.querySelector("#ID_shgJn1")?.textContent?.trim() ?? null,
    employeeCount:
      document.querySelector("#ID_jgisKigyoZentai")?.textContent?.trim() ??
      null,
    workPlace:
      document.querySelector("#ID_shgBsJusho")?.textContent?.trim() ?? null,
    jobDescription:
      document.querySelector("#ID_shigotoNy")?.textContent?.trim() ?? null,
    qualifications:
      document.querySelector("#ID_hynaMenkyoSkku")?.textContent?.trim() ?? null,
  };
}

// ── ページ操作ヘルパー ──

function listJobOverviewElem(page: JobListPage) {
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

function goToJobDetailPage(page: JobListPage) {
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
    // ページタイトルで求人詳細ページであることを確認
    const jobTitle = yield* Effect.tryPromise({
      try: () => page.locator("div.page_title").textContent(),
      catch: (e) =>
        new FromJobListToJobDetailPageError({
          message: `failed to read page title: ${String(e)}`,
        }),
    });
    if (jobTitle !== "求人情報") {
      return yield* new FromJobListToJobDetailPageError({
        message: `expected page title "求人情報" but got "${jobTitle}"`,
      });
    }
    const _page: Page = page;
    return _page as JobDetailPage;
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
        const jobListPage = yield* navigateSearchToJobListByJobNumber(
          jobSearchPage,
          jobNumber,
        );
        yield* Effect.logDebug("now on job list page.");
        const jobDetailPage = yield* goToJobDetailPage(jobListPage);
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
