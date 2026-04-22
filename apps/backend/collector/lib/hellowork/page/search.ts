import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import { type Page, openBrowserPage } from "../browser";
import { InvalidJobNumberFormatError, PageActionError } from "../errors";
import type { FirstJobListPage } from "../job-number-crawler/type";

// ============================================================
// Branded page type — かんたん検索ページ
// ============================================================

const _simpleJobSearchPage: unique symbol = Symbol("SimpleJobSearchPage");
export type SimpleJobSearchPage = Page & { [_simpleJobSearchPage]: unknown };

// ============================================================
// Criteria — かんたん検索で指定可能な条件（最小）
// ============================================================

export type EngineeringLabel = "ソフトウェア開発技術者、プログラマー";

export type SimpleJobSearchCriteria = {
  readonly jobNumber?: typeof JobNumber.Type;
  readonly desiredOccupation?: {
    readonly occupationSelection?: EngineeringLabel;
  };
};

// ============================================================
// Internal helpers
// ============================================================

const fillOccupationField = Effect.fn("fillOccupationField")(function* (
  page: SimpleJobSearchPage,
  label: EngineeringLabel,
) {
  yield* Effect.logDebug(`will execute fillOccupationField\nlabel=${label}`);
  yield* Effect.tryPromise({
    try: async () => {
      await page.locator("#ID_LdaiEasyShokusyuBox11").click();
      await page.locator("#ID_LmodalTmpEasyShokusyuBox1100").click();
      await page.getByRole("button", { name: "決定" }).click();
    },
    catch: (e) =>
      new PageActionError({
        reason: `fillOccupationField failed: label=${label}`,
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug(`filled occupation field. label=${label}`);
});

const fillJobCriteriaField = Effect.fn("fillJobCriteriaField")(function* (
  page: SimpleJobSearchPage,
  criteria: SimpleJobSearchCriteria,
) {
  const { desiredOccupation } = criteria;
  if (desiredOccupation?.occupationSelection) {
    yield* fillOccupationField(page, desiredOccupation.occupationSelection);
  }
});

const clickSearchNoBtn = Effect.fn("clickSearchNoBtn")(function* (
  page: SimpleJobSearchPage,
) {
  yield* Effect.tryPromise({
    try: async () => {
      await Promise.all([
        page.waitForURL("**/kensaku/*.do"),
        page.locator("#ID_searchNoBtn >> visible=true").first().click(),
      ]);
    },
    catch: (e) =>
      new PageActionError({
        reason: "clickSearchNoBtn failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug("navigated to job list page from job search page.");
});

const clickSearchBtn = Effect.fn("clickSearchBtn")(function* (
  page: SimpleJobSearchPage,
) {
  yield* Effect.tryPromise({
    try: async () => {
      await Promise.all([
        page.waitForURL("**/kensaku/*.do"),
        page.locator("#ID_searchBtn").click(),
      ]);
    },
    catch: (e) =>
      new PageActionError({
        reason: "clickSearchBtn failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug("navigated to job list page from job search page.");
});

// ============================================================
// Public API
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
        reason: "navigation to job search page failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug("navigated to job search page.");
  return page as SimpleJobSearchPage;
});

export const navigateByJobNumber = Effect.fn("navigateByJobNumber")(function* (
  page: SimpleJobSearchPage,
  jobNumber: string,
) {
  const [jo, ge] = jobNumber.split("-");
  if (!jo || !ge) {
    return yield* Effect.fail(
      new InvalidJobNumberFormatError({
        reason: `invalid jobNumber format: ${jobNumber}, expected "XXXXX-XXXXXXXX"`,
      }),
    );
  }
  yield* Effect.tryPromise({
    try: async () => {
      await page.locator("#ID_kJNoJo1").fill(jo);
      await page.locator("#ID_kJNoGe1").fill(ge);
    },
    catch: (e) =>
      new PageActionError({
        reason: `navigateByJobNumber failed: jobNumber=${jobNumber}`,
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`);
  yield* clickSearchNoBtn(page);
  const _page: Page = page;
  return _page as FirstJobListPage;
});

export const navigateByCriteria = Effect.fn("navigateByCriteria")(function* (
  page: SimpleJobSearchPage,
  criteria: SimpleJobSearchCriteria,
) {
  yield* fillJobCriteriaField(page, criteria);
  yield* clickSearchBtn(page);
  const _page: Page = page;
  return _page as FirstJobListPage;
});
