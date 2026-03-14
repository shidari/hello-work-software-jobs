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
  // 既存
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
  // 新規: 求人情報
  establishmentNumber: "#ID_jgshNo",
  jobCategory: "#ID_kjKbn",
  industryClassification: "#ID_sngBrui",
  publicEmploymentOffice: "#ID_juriAtsh",
  onlineApplicationAccepted: "#ID_onlinJishuOboUktkKahi",
  // 新規: 仕事内容
  dispatchType: "#ID_hakenUkeoiToShgKeitai",
  employmentPeriod: "#ID_koyoKikan",
  ageRequirement: "#ID_nenreiSegn",
  education: "#ID_grki",
  requiredExperience: "#ID_hynaKiknt",
  trialPeriod: "#ID_trialKikan",
  carCommute: "#ID_mycarTskn",
  transferPossibility: "#ID_tenkinNoKnsi",
  // 新規: 賃金
  wageType: "#ID_chgnKeitaiToKbn",
  raise: "#ID_shokyuSd",
  bonus: "#ID_shoyoSdNoUmu",
  // 新規: その他条件
  insurance: "#ID_knyHoken",
  retirementBenefit: "#ID_tskinSd",
} as const;

const companyDetailSelectors = {
  establishmentNumber: "#ID_jgshNo",
  companyName: "#ID_jgshMei",
  postalCode: "#ID_szciYbn",
  address: "#ID_szci",
  employeeCount: "#ID_jgisKigyoZentai",
  foundedYear: "#ID_setsuritsuNen",
  capital: "#ID_shkn",
  businessDescription: "#ID_jigyoNy",
  corporateNumber: "#ID_hoNinNo",
} as const;

// ── DOM テキスト抽出ヘルパー ──

function textOf(document: Document, selector: string): string | null {
  return document.querySelector(selector)?.textContent?.trim() || null;
}

// ── DOM → RawJob 抽出 ──

export function extractRawFieldsFromDocument(document: Document): RawJob {
  const s = jobDetailSelectors;
  return {
    jobNumber: textOf(document, s.jobNumber),
    companyName: textOf(document, s.companyName),
    receivedDate: textOf(document, s.receivedDate),
    expiryDate: textOf(document, s.expiryDate),
    homePage: textOf(document, s.homePage),
    occupation: textOf(document, s.occupation),
    employmentType: textOf(document, s.employmentType),
    wage: textOf(document, s.wage),
    workingHours: textOf(document, s.workingHours),
    employeeCount: textOf(document, s.employeeCount),
    workPlace: textOf(document, s.workPlace),
    jobDescription: textOf(document, s.jobDescription),
    qualifications: textOf(document, s.qualifications),
    // 新規フィールド
    establishmentNumber: textOf(document, s.establishmentNumber),
    jobCategory: textOf(document, s.jobCategory),
    industryClassification: textOf(document, s.industryClassification),
    publicEmploymentOffice: textOf(document, s.publicEmploymentOffice),
    onlineApplicationAccepted: textOf(document, s.onlineApplicationAccepted),
    dispatchType: textOf(document, s.dispatchType),
    employmentPeriod: textOf(document, s.employmentPeriod),
    ageRequirement: textOf(document, s.ageRequirement),
    education: textOf(document, s.education),
    requiredExperience: textOf(document, s.requiredExperience),
    trialPeriod: textOf(document, s.trialPeriod),
    carCommute: textOf(document, s.carCommute),
    transferPossibility: textOf(document, s.transferPossibility),
    wageType: textOf(document, s.wageType),
    raise: textOf(document, s.raise),
    bonus: textOf(document, s.bonus),
    insurance: textOf(document, s.insurance),
    retirementBenefit: textOf(document, s.retirementBenefit),
  };
}

// ── DOM → RawCompany 抽出 ──

export function extractRawCompanyFromDocument(document: Document): RawCompany {
  const s = companyDetailSelectors;
  return {
    establishmentNumber: textOf(document, s.establishmentNumber),
    companyName: textOf(document, s.companyName),
    postalCode: textOf(document, s.postalCode),
    address: textOf(document, s.address),
    employeeCount: textOf(document, s.employeeCount),
    foundedYear: textOf(document, s.foundedYear),
    capital: textOf(document, s.capital),
    businessDescription: textOf(document, s.businessDescription),
    corporateNumber: textOf(document, s.corporateNumber),
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
        return {
          rawHtml,
          fetchedDate: nowISODateString(),
          jobNumber,
        };
      });

      return {
        extractRawHtml: (jobNumber: JobNumber) => extractRawHtml(jobNumber),
      };
    }),
  },
) {}
