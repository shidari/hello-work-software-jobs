import { Data, Effect } from "effect";
import type { Page } from "./browser";
import { openBrowserPage } from "./browser";
import type {
  DirtyWorkLocation,
  EmploymentType,
  EngineeringLabel,
  JobSearchCriteria,
  SearchPeriod,
} from "./job-number-crawler/crawl";

// ============================================================
// Errors
// ============================================================

class PageActionError extends Data.TaggedError("PageActionError")<{
  readonly message: string;
  readonly error?: unknown;
}> {}

// ============================================================
// Branded page types
// ============================================================

const _jobSearchPage: unique symbol = Symbol("JobSearchPage");
export type JobSearchPage = Page & { [_jobSearchPage]: unknown };

const _firstJobListPage: unique symbol = Symbol("FirstJobListPage");
export type FirstJobListPage = Page & { [_firstJobListPage]: unknown };

const _jobDetailPage: unique symbol = Symbol("JobDetailPage");
export type JobDetailPage = Page & { [_jobDetailPage]: unknown };

// ============================================================
// Page operations (Effect.fn with page argument)
// ============================================================

const fillWorkType = Effect.fn("fillWorkType")(function* (
  page: JobSearchPage,
  employmentType: EmploymentType,
) {
  const selector =
    employmentType === "RegularEmployee"
      ? "#ID_LippanCKBox1"
      : "#ID_LippanCKBox2";
  yield* Effect.tryPromise({
    try: () => page.locator(selector).check(),
    catch: (e) =>
      new PageActionError({
        message: `fillWorkType failed: employmentType=${employmentType}`,
        error: e,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(
        `filled work type field. employmentType=${employmentType}`,
      ),
    ),
  );
});

const fillPrefectureField = Effect.fn("fillPrefectureField")(function* (
  page: JobSearchPage,
  workLocation: DirtyWorkLocation,
) {
  const { prefecture } = workLocation;
  yield* Effect.logDebug(
    `fill PrefectureField.\nworkLocation: ${JSON.stringify(workLocation, null, 2)}`,
  );
  yield* Effect.tryPromise({
    try: () => page.locator("#ID_tDFK1CmbBox").selectOption(prefecture),
    catch: (e) =>
      new PageActionError({
        message: `fillPrefectureField failed: workLocation=${JSON.stringify(workLocation)}`,
        error: e,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(`filled prefecture field. prefecture=${prefecture}`),
    ),
  );
});

const fillOccupationField = Effect.fn("fillOccupationField")(function* (
  page: JobSearchPage,
  label: EngineeringLabel,
) {
  const radioBtn = "#ID_skCheck094";
  const openerSibling = "#ID_skHid09";
  yield* Effect.logDebug(
    `will execute fillOccupationField\nlabel=${label}\nradioBtn=${radioBtn}, openerSibling=${openerSibling}`,
  );
  yield* Effect.tryPromise({
    try: async () => {
      const firstoccupationSelectionBtn = page
        .locator("#ID_Btn", { hasText: /職種を選択/ })
        .first();
      await firstoccupationSelectionBtn.click();
      const openerSiblingLoc = page.locator(openerSibling);
      const opener = openerSiblingLoc.locator("..").locator("i.one_i");
      await opener.click();
      const radioBtnLoc = page.locator(radioBtn);
      await radioBtnLoc.click();
      const okBtn = page.locator("#ID_ok3");
      await okBtn.click();
    },
    catch: (e) =>
      new PageActionError({
        message: `fillOccupationField failed: label=${label}`,
        error: e,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(`filled occupation field. label=${label}`),
    ),
  );
});

const fillJobPeriod = Effect.fn("fillJobPeriod")(function* (
  page: JobSearchPage,
  searchPeriod: SearchPeriod,
) {
  yield* Effect.logDebug(`fillJobPeriod: searchPeriod=${searchPeriod}`);
  const id =
    searchPeriod === "today"
      ? "#ID_newArrivedCKBox1"
      : searchPeriod === "week"
        ? "#ID_newArrivedCKBox2"
        : null;
  if (id) {
    yield* Effect.tryPromise({
      try: () => page.locator(id).check(),
      catch: (e) =>
        new PageActionError({
          message: `fillJobPeriod failed: searchPeriod=${searchPeriod}`,
          error: e,
        }),
    });
  }
});

const fillJobCriteriaField = Effect.fn("fillJobCriteriaField")(function* (
  page: JobSearchPage,
  criteria: JobSearchCriteria,
) {
  const { employmentType, workLocation, desiredOccupation, searchPeriod } =
    criteria;
  if (employmentType) yield* fillWorkType(page, employmentType);
  if (workLocation) yield* fillPrefectureField(page, workLocation);
  if (desiredOccupation?.occupationSelection) {
    yield* fillOccupationField(page, desiredOccupation.occupationSelection);
  }
  if (searchPeriod) yield* fillJobPeriod(page, searchPeriod);
});

const clickSearchNoBtn = Effect.fn("clickSearchNoBtn")(function* (
  page: JobSearchPage,
) {
  yield* Effect.tryPromise({
    try: async () => {
      const searchNoBtn = page.locator("#ID_searchNoBtn");
      await Promise.all([
        page.waitForURL("**/kensaku/*.do"),
        searchNoBtn.click(),
      ]);
    },
    catch: (e) =>
      new PageActionError({
        message: "clickSearchNoBtn failed",
        error: e,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug("navigated to job list page from job search page."),
    ),
  );
});

const clickSearchBtn = Effect.fn("clickSearchBtn")(function* (
  page: JobSearchPage,
) {
  yield* Effect.tryPromise({
    try: async () => {
      const searchBtn = page.locator("#ID_searchBtn");
      await Promise.all([
        page.waitForURL("**/kensaku/*.do"),
        searchBtn.click(),
      ]);
    },
    catch: (e) =>
      new PageActionError({
        message: "clickSearchBtn failed",
        error: e,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug("navigated to job list page from job search page."),
    ),
  );
});

// ============================================================
// Constructors (Effect.fn)
// ============================================================

export const openJobSearchPage = Effect.fn("openJobSearchPage")(function* () {
  const page = yield* openBrowserPage();
  yield* Effect.tryPromise({
    try: () =>
      page.goto(
        "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010",
      ),
    catch: (e) =>
      new PageActionError({
        message: "navigation failed",
        error: e,
      }),
  }).pipe(Effect.tap(() => Effect.logDebug("navigated to job search page.")));
  return page as JobSearchPage;
});

export const navigateByJobNumber = Effect.fn("navigateByJobNumber")(function* (
  page: JobSearchPage,
  jobNumber: string,
) {
  yield* Effect.tryPromise({
    try: async () => {
      const jobNumberSplits = jobNumber.split("-");
      const firstJobNumber = jobNumberSplits.at(0);
      const secondJobNumber = jobNumberSplits.at(1);
      if (!firstJobNumber)
        throw new Error(`firstJobNumber undefined. jobNumber=${jobNumber}`);
      if (!secondJobNumber)
        throw new Error(`secondJobNumber undefined. jobNumber=${jobNumber}`);
      const firstJobNumberInput = page.locator("#ID_kJNoJo1");
      const secondJobNumberInput = page.locator("#ID_kJNoGe1");
      await firstJobNumberInput.fill(firstJobNumber);
      await secondJobNumberInput.fill(secondJobNumber);
    },
    catch: (e) =>
      new PageActionError({
        message: `byJobNumber failed: jobNumber=${jobNumber}`,
        error: e,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`),
    ),
  );
  yield* clickSearchNoBtn(page);
  const _page: Page = page;
  return _page as FirstJobListPage;
});

export const navigateByCriteria = Effect.fn("navigateByCriteria")(function* (
  page: JobSearchPage,
  criteria: JobSearchCriteria,
) {
  yield* fillJobCriteriaField(page, criteria);
  yield* clickSearchBtn(page);
  const _page: Page = page;
  return _page as FirstJobListPage;
});
