import type { JobNumber } from "@sho/models";
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
  // 既存フィールド
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
  // 新規: 求人情報
  establishmentNumber: Schema.NullOr(Schema.String),
  jobCategory: Schema.NullOr(Schema.String),
  industryClassification: Schema.NullOr(Schema.String),
  publicEmploymentOffice: Schema.NullOr(Schema.String),
  onlineApplicationAccepted: Schema.NullOr(Schema.String),
  // 新規: 仕事内容
  dispatchType: Schema.NullOr(Schema.String),
  employmentPeriod: Schema.NullOr(Schema.String),
  ageRequirement: Schema.NullOr(Schema.String),
  education: Schema.NullOr(Schema.String),
  requiredExperience: Schema.NullOr(Schema.String),
  trialPeriod: Schema.NullOr(Schema.String),
  carCommute: Schema.NullOr(Schema.String),
  transferPossibility: Schema.NullOr(Schema.String),
  // 新規: 賃金
  wageType: Schema.NullOr(Schema.String),
  raise: Schema.NullOr(Schema.String),
  bonus: Schema.NullOr(Schema.String),
  // 新規: その他条件
  insurance: Schema.NullOr(Schema.String),
  retirementBenefit: Schema.NullOr(Schema.String),
});
export type RawJob = typeof RawJob.Type;

// ── RawCompany スキーマ: DOM から抽出した会社情報生テキスト ──

export const RawCompany = Schema.Struct({
  establishmentNumber: Schema.NullOr(Schema.String),
  companyName: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.String),
  foundedYear: Schema.NullOr(Schema.String),
  capital: Schema.NullOr(Schema.String),
  businessDescription: Schema.NullOr(Schema.String),
  corporateNumber: Schema.NullOr(Schema.String),
});
export type RawCompany = typeof RawCompany.Type;

// ── エラー ──

export class ExtractJobDetailRawHtmlError extends Data.TaggedError(
  "ExtractJobDetailRawHtmlError",
)<{
  readonly jobNumber: string;
  readonly currentUrl: string;
  readonly reason: string;
  readonly error?: unknown;
}> {}

class FromJobListToJobDetailPageError extends Data.TaggedError(
  "FromJobListToJobDetailPageError",
)<{ readonly message: string; readonly error?: unknown }> {}

class AssertSingleJobListedError extends Data.TaggedError(
  "AssertSingleJobListedError",
)<{ readonly message: string; readonly error?: unknown }> {}

class ListJobsError extends Data.TaggedError("ListJobsError")<{
  readonly message: string;
  readonly error?: unknown;
}> {}

class JobDetailPageValidationError extends Data.TaggedError(
  "JobDetailPageValidationError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly error?: unknown;
}> {}

// ── DOM → RawJob 抽出 ──

export function extractRawFieldsFromDocument(document: Document): RawJob {
  return {
    jobNumber: document.querySelector("#ID_kjNo")?.textContent?.trim() || null,
    companyName:
      document.querySelector("#ID_jgshMei")?.textContent?.trim() || null,
    receivedDate:
      document.querySelector("#ID_uktkYmd")?.textContent?.trim() || null,
    expiryDate:
      document.querySelector("#ID_shkiKigenHi")?.textContent?.trim() || null,
    homePage: document.querySelector("#ID_hp")?.textContent?.trim() || null,
    occupation: document.querySelector("#ID_sksu")?.textContent?.trim() || null,
    employmentType:
      document.querySelector("#ID_koyoKeitai")?.textContent?.trim() || null,
    wage: document.querySelector("#ID_chgn")?.textContent?.trim() || null,
    workingHours:
      document.querySelector("#ID_shgJn1")?.textContent?.trim() || null,
    employeeCount:
      document.querySelector("#ID_jgisKigyoZentai")?.textContent?.trim() ||
      null,
    workPlace:
      document.querySelector("#ID_shgBsJusho")?.textContent?.trim() || null,
    jobDescription:
      document.querySelector("#ID_shigotoNy")?.textContent?.trim() || null,
    qualifications:
      document.querySelector("#ID_hynaMenkyoSkku")?.textContent?.trim() || null,
    establishmentNumber:
      document.querySelector("#ID_jgshNo")?.textContent?.trim() || null,
    jobCategory:
      document.querySelector("#ID_kjKbn")?.textContent?.trim() || null,
    industryClassification:
      document.querySelector("#ID_sngBrui")?.textContent?.trim() || null,
    publicEmploymentOffice:
      document.querySelector("#ID_juriAtsh")?.textContent?.trim() || null,
    onlineApplicationAccepted:
      document
        .querySelector("#ID_onlinJishuOboUktkKahi")
        ?.textContent?.trim() || null,
    dispatchType:
      document
        .querySelector("#ID_hakenUkeoiToShgKeitai")
        ?.textContent?.trim() || null,
    employmentPeriod:
      document.querySelector("#ID_koyoKikan")?.textContent?.trim() || null,
    ageRequirement:
      document.querySelector("#ID_nenreiSegn")?.textContent?.trim() || null,
    education: document.querySelector("#ID_grki")?.textContent?.trim() || null,
    requiredExperience:
      document.querySelector("#ID_hynaKiknt")?.textContent?.trim() || null,
    trialPeriod:
      document.querySelector("#ID_trialKikan")?.textContent?.trim() || null,
    carCommute:
      document.querySelector("#ID_mycarTskn")?.textContent?.trim() || null,
    transferPossibility:
      document.querySelector("#ID_tenkinNoKnsi")?.textContent?.trim() || null,
    wageType:
      document.querySelector("#ID_chgnKeitaiToKbn")?.textContent?.trim() ||
      null,
    raise: document.querySelector("#ID_shokyuSd")?.textContent?.trim() || null,
    bonus:
      document.querySelector("#ID_shoyoSdNoUmu")?.textContent?.trim() || null,
    insurance:
      document.querySelector("#ID_knyHoken")?.textContent?.trim() || null,
    retirementBenefit:
      document.querySelector("#ID_tskinSd")?.textContent?.trim() || null,
  };
}

// ── DOM → RawCompany 抽出 ──

export function extractRawCompanyFromDocument(document: Document): RawCompany {
  return {
    establishmentNumber:
      document.querySelector("#ID_jgshNo")?.textContent?.trim() || null,
    companyName:
      document.querySelector("#ID_jgshMei")?.textContent?.trim() || null,
    postalCode:
      document.querySelector("#ID_szciYbn")?.textContent?.trim() || null,
    address: document.querySelector("#ID_szci")?.textContent?.trim() || null,
    employeeCount:
      document.querySelector("#ID_jgisKigyoZentai")?.textContent?.trim() ||
      null,
    foundedYear:
      document.querySelector("#ID_setsuritsuNen")?.textContent?.trim() || null,
    capital: document.querySelector("#ID_shkn")?.textContent?.trim() || null,
    businessDescription:
      document.querySelector("#ID_jigyoNy")?.textContent?.trim() || null,
    corporateNumber:
      document.querySelector("#ID_hoNinNo")?.textContent?.trim() || null,
  };
}

// ── ページ操作ヘルパー ──

function listJobOverviewElem(page: FirstJobListPage) {
  return Effect.tryPromise({
    try: () => page.locator("table.kyujin").all(),
    catch: (e) => new ListJobsError({ message: "unexpected error", error: e }),
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
          message: "unexpected error",
          error: e,
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
          error: e,
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

// ── Extractor サービス ──

export class JobDetailExtractor extends Effect.Service<JobDetailExtractor>()(
  "JobDetailExtractor",
  {
    scoped: Effect.gen(function* () {
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
              error,
            }),
        });
        return {
          rawHtml,
          fetchedDate: new Date().toISOString().slice(0, 10),
          jobNumber,
        };
      });

      return { extractRawHtml };
    }),
  },
) {}
