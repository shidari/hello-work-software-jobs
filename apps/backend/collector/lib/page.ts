import { Context, Data, Effect } from "effect";
import type { Page } from "./browser";
import { PlaywrightChromiumPageResource } from "./browser";
import type {
  DirtyWorkLocation,
  EmploymentType,
  EmploymentTypeSelector,
  EngineeringLabel,
  EngineeringLabelSelectorOpenerSibling,
  EngineeringLabelSelectorRadioBtn,
  JobSearchCriteria,
  SearchPeriod,
} from "./job-number-crawler/type";

// ============================================================
// Errors
// ============================================================

class PageActionError extends Data.TaggedError("PageActionError")<{
  readonly message: string;
}> {}

// ============================================================
// Context Tags (branded page types)
// ============================================================

const _jobSearchPage: unique symbol = Symbol("JobSearchPage");
export type JobSearchPage = Page & { [_jobSearchPage]: unknown };
export class JobSearchPageTag extends Context.Tag("JobSearchPage")<
  JobSearchPageTag,
  JobSearchPage
>() {}

const _firstJobListPage: unique symbol = Symbol("FirstJobListPage");
export type FirstJobListPage = Page & { [_firstJobListPage]: unknown };

// ============================================================
// Selector mappings (pure data)
// ============================================================

const employmentTypeSelectors = {
  RegularEmployee: "#ID_LippanCKBox1",
  PartTimeWorker: "#ID_LippanCKBox2",
} as const;

const engineeringLabelSelectors = {
  "ソフトウェア開発技術者、プログラマー": {
    radioBtn: "#ID_skCheck094",
    openerSibling: "#ID_skHid09",
  },
} as const;

const searchPeriodSelectors = {
  today: "#ID_newArrivedCKBox1",
  week: "#ID_newArrivedCKBox2",
  all: null,
} as const;

// ============================================================
// Page operations (context-based Effect.fn)
// ============================================================

const fillWorkType = Effect.fn("fillWorkType")(function* (
  employmentType: EmploymentType,
) {
  const page = yield* JobSearchPageTag;
  const selector = employmentTypeSelectors[employmentType] as
    | string
    | undefined;
  if (!selector) {
    return yield* new PageActionError({
      message: `unknown employment type: ${employmentType}`,
    });
  }
  yield* Effect.tryPromise({
    try: () => page.locator(selector as EmploymentTypeSelector).check(),
    catch: (e) =>
      new PageActionError({
        message: `fillWorkType failed: employmentType=${employmentType} ${String(e)}`,
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
  workLocation: DirtyWorkLocation,
) {
  const page = yield* JobSearchPageTag;
  const { prefecture } = workLocation;
  yield* Effect.logDebug(
    `fill PrefectureField.\nworkLocation: ${JSON.stringify(workLocation, null, 2)}`,
  );
  yield* Effect.tryPromise({
    try: () => page.locator("#ID_tDFK1CmbBox").selectOption(prefecture),
    catch: (e) =>
      new PageActionError({
        message: `fillPrefectureField failed: workLocation=${JSON.stringify(workLocation)} ${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(`filled prefecture field. prefecture=${prefecture}`),
    ),
  );
});

const fillOccupationField = Effect.fn("fillOccupationField")(function* (
  label: EngineeringLabel,
) {
  const page = yield* JobSearchPageTag;
  const selector = engineeringLabelSelectors[label] as
    | { radioBtn: string; openerSibling: string }
    | undefined;
  if (!selector) {
    return yield* new PageActionError({
      message: `unknown engineering label: ${label}`,
    });
  }
  yield* Effect.logDebug(
    `will execute fillOccupationField\nlabel=${label}\nselector=${JSON.stringify(selector, null, 2)}`,
  );
  yield* Effect.tryPromise({
    try: async () => {
      const firstoccupationSelectionBtn = page
        .locator("#ID_Btn", { hasText: /職種を選択/ })
        .first();
      await firstoccupationSelectionBtn.click();
      const openerSibling = page.locator(
        selector.openerSibling as EngineeringLabelSelectorOpenerSibling,
      );
      const opener = openerSibling.locator("..").locator("i.one_i");
      await opener.click();
      const radioBtn = page.locator(
        selector.radioBtn as EngineeringLabelSelectorRadioBtn,
      );
      await radioBtn.click();
      const okBtn = page.locator("#ID_ok3");
      await okBtn.click();
    },
    catch: (e) =>
      new PageActionError({
        message: `fillOccupationField failed: label=${label}\n${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(`filled occupation field. label=${label}`),
    ),
  );
});

const fillJobPeriod = Effect.fn("fillJobPeriod")(function* (
  searchPeriod: SearchPeriod,
) {
  const page = yield* JobSearchPageTag;
  yield* Effect.logDebug(`fillJobPeriod: searchPeriod=${searchPeriod}`);
  const id = searchPeriodSelectors[searchPeriod];
  if (id) {
    yield* Effect.tryPromise({
      try: () => page.locator(id).check(),
      catch: (e) =>
        new PageActionError({
          message: `fillJobPeriod failed: searchPeriod=${searchPeriod} ${String(e)}`,
        }),
    });
  }
});

export const fillJobCriteriaField = Effect.fn("fillJobCriteriaField")(
  function* (criteria: JobSearchCriteria) {
    const { employmentType, workLocation, desiredOccupation, searchPeriod } =
      criteria;
    if (employmentType) yield* fillWorkType(employmentType);
    if (workLocation) yield* fillPrefectureField(workLocation);
    if (desiredOccupation?.occupationSelection) {
      yield* fillOccupationField(desiredOccupation.occupationSelection);
    }
    if (searchPeriod) yield* fillJobPeriod(searchPeriod);
  },
);

const clickSearchNoBtn = Effect.fn("clickSearchNoBtn")(function* () {
  const page = yield* JobSearchPageTag;
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
        message: `clickSearchNoBtn failed: ${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug("navigated to job list page from job search page."),
    ),
  );
});

const clickSearchBtn = Effect.fn("clickSearchBtn")(function* () {
  const page = yield* JobSearchPageTag;
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
        message: `clickSearchBtn failed: ${String(e)}`,
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
  const { page } = yield* PlaywrightChromiumPageResource;
  yield* Effect.tryPromise({
    try: () =>
      page.goto(
        "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010",
      ),
    catch: (e) =>
      new PageActionError({
        message: `navigation failed: ${String(e)}`,
      }),
  }).pipe(Effect.tap(() => Effect.logDebug("navigated to job search page.")));
  return page as JobSearchPage;
});

export const navigateByJobNumber = Effect.fn("navigateByJobNumber")(function* (
  jobNumber: string,
) {
  const page = yield* JobSearchPageTag;
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
        message: `byJobNumber failed: jobNumber=${jobNumber}\n${String(e)}`,
      }),
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`),
    ),
  );
  yield* clickSearchNoBtn();
  return page as unknown as FirstJobListPage;
});

export const navigateByCriteria = Effect.fn("navigateByCriteria")(function* (
  criteria: JobSearchCriteria,
) {
  const page = yield* JobSearchPageTag;
  yield* fillJobCriteriaField(criteria);
  yield* clickSearchBtn();
  return page as unknown as FirstJobListPage;
});
