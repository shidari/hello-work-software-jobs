import type { JobNumber } from "@sho/models";
import { Data, Effect } from "effect";
import type { Page } from "./browser";
import { openBrowserPage } from "./browser";

// ============================================================
// Page operation types
// ============================================================

export type EngineeringLabel = "ソフトウェア開発技術者、プログラマー";

export type JobSearchCriteria = {
  readonly jobNumber?: typeof JobNumber.Type;
  readonly desiredOccupation?: {
    readonly occupationSelection?: EngineeringLabel;
  };
};

// ── Errors ──

class PageActionError extends Data.TaggedError("PageActionError")<{
  readonly message: string;
  readonly error: unknown;
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
// Page operations
// ============================================================

const fillOccupationField = Effect.fn("fillOccupationField")(function* (
  page: JobSearchPage,
  label: EngineeringLabel,
) {
  yield* Effect.logDebug(`will execute fillOccupationField\nlabel=${label}`);
  yield* Effect.orDieWith(
    Effect.tryPromise({
      try: async () => {
        await page.locator("#ID_LdaiEasyShokusyuBox11").click();
        await page.locator("#ID_LmodalTmpEasyShokusyuBox1100").click();
        await page.getByRole("button", { name: "決定" }).click();
      },
      catch: (error) =>
        new PageActionError({
          message: `fillOccupationField failed: label=${label}`,
          error,
        }),
    }),
    (e) =>
      new Error(
        `fillOccupationField failed: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  yield* Effect.logDebug(`filled occupation field. label=${label}`);
});

const fillJobCriteriaField = Effect.fn("fillJobCriteriaField")(function* (
  page: JobSearchPage,
  criteria: JobSearchCriteria,
) {
  const { desiredOccupation } = criteria;
  if (desiredOccupation?.occupationSelection) {
    yield* fillOccupationField(page, desiredOccupation.occupationSelection);
  }
});

const clickSearchNoBtn = Effect.fn("clickSearchNoBtn")(function* (
  page: JobSearchPage,
) {
  yield* Effect.orDieWith(
    Effect.tryPromise({
      try: async () => {
        await Promise.all([
          page.waitForURL("**/kensaku/*.do"),
          // ページ内に #ID_searchNoBtn が2つ存在するため visible なものに絞り込む
          page.locator("#ID_searchNoBtn >> visible=true").click(),
        ]);
      },
      catch: (error) =>
        new PageActionError({ message: "clickSearchNoBtn failed", error }),
    }),
    (e) =>
      new Error(
        `clickSearchNoBtn failed: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  yield* Effect.logDebug("navigated to job list page from job search page.");
});

const clickSearchBtn = Effect.fn("clickSearchBtn")(function* (
  page: JobSearchPage,
) {
  yield* Effect.orDieWith(
    Effect.tryPromise({
      try: async () => {
        await Promise.all([
          page.waitForURL("**/kensaku/*.do"),
          page.locator("#ID_searchBtn").click(),
        ]);
      },
      catch: (error) =>
        new PageActionError({ message: "clickSearchBtn failed", error }),
    }),
    (e) =>
      new Error(
        `clickSearchBtn failed: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  yield* Effect.logDebug("navigated to job list page from job search page.");
});

// ============================================================
// Constructors
// ============================================================

export const openJobSearchPage = Effect.fn("openJobSearchPage")(function* () {
  const page = yield* openBrowserPage();
  yield* Effect.orDieWith(
    Effect.tryPromise({
      try: () =>
        page.goto(
          "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010",
        ),
      catch: (error) =>
        new PageActionError({ message: "navigation failed", error }),
    }),
    (e) =>
      new Error(
        `navigation failed: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  yield* Effect.logDebug("navigated to job search page.");
  return page as JobSearchPage;
});

export const navigateByJobNumber = Effect.fn("navigateByJobNumber")(function* (
  page: JobSearchPage,
  jobNumber: string,
) {
  const [jo, ge] = jobNumber.split("-");
  if (!jo || !ge) {
    return yield* Effect.die(
      new Error(
        `invalid jobNumber format: ${jobNumber}, expected "XXXXX-XXXXXXXX"`,
      ),
    );
  }
  yield* Effect.orDieWith(
    Effect.tryPromise({
      try: async () => {
        await page.locator("#ID_kJNoJo1").fill(jo);
        await page.locator("#ID_kJNoGe1").fill(ge);
      },
      catch: (error) =>
        new PageActionError({
          message: `navigateByJobNumber failed: jobNumber=${jobNumber}`,
          error,
        }),
    }),
    (e) =>
      new Error(
        `navigateByJobNumber failed: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  yield* Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`);
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
