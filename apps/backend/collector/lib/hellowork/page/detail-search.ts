import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import type { Page } from "../browser";
import { PageActionError } from "../errors";
import type { FirstJobListPage } from "../job-number-crawler/type";
import type { SimpleJobSearchPage } from "./search";

// ============================================================
// Branded page type — 詳細検索ページ
// ============================================================

const _detailedJobSearchPage: unique symbol = Symbol("DetailedJobSearchPage");
export type DetailedJobSearchPage = Page & {
  [_detailedJobSearchPage]: unknown;
};

// ============================================================
// Criteria — 詳しい条件で検索ページで指定可能な条件
// ============================================================

export type EngineeringLabel = "ソフトウェア開発技術者、プログラマー";

// 詳細検索ページ `newArrivedCKBox` と対応:
//   "withinTwoDays" → value=1（新着：当日・前日）
//   "withinWeek"    → value=2（新着：1週間以内）
export type SearchPeriod = "withinTwoDays" | "withinWeek";

export type DetailedJobSearchCriteria = {
  readonly jobNumber?: typeof JobNumber.Type;
  readonly desiredOccupation?: {
    readonly occupationSelection?: EngineeringLabel;
  };
  readonly searchPeriod?: SearchPeriod;
};

// ============================================================
// Internal helpers
// ============================================================

// 職業分類モーダルから対象の職種を選ぶ。
// 詳細ページのモーダルは大分類がアコーディオン折りたたみのため、該当カテゴリを
// 先に展開してから checkbox をクリックする必要がある。
const fillOccupationField = Effect.fn("fillOccupationField")(function* (
  page: DetailedJobSearchPage,
  label: EngineeringLabel,
) {
  yield* Effect.logDebug(
    `will execute fillOccupationField (detailed)\nlabel=${label}`,
  );
  yield* Effect.tryPromise({
    try: async () => {
      await page.getByRole("button", { name: "職種を選択" }).first().click();
      await page.getByText("技術職（建設、開発、ＩＴ）、専門職").click();
      await page.getByText(label, { exact: true }).first().click();
      await page.getByRole("button", { name: "決定" }).click();
    },
    catch: (e) =>
      new PageActionError({
        reason: `fillOccupationField (detailed) failed: label=${label}`,
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug(`filled occupation field (detailed). label=${label}`);
});

// 検索期間の新着チェックボックスを click。
//   withinTwoDays → #ID_newArrivedCKBox1（当日・前日）
//   withinWeek    → #ID_newArrivedCKBox2（1週間以内）
const fillSearchPeriodField = Effect.fn("fillSearchPeriodField")(function* (
  page: DetailedJobSearchPage,
  period: SearchPeriod,
) {
  const selectorId =
    period === "withinTwoDays"
      ? "#ID_newArrivedCKBox1"
      : "#ID_newArrivedCKBox2";
  yield* Effect.logDebug(
    `will execute fillSearchPeriodField\nperiod=${period} selector=${selectorId}`,
  );
  yield* Effect.tryPromise({
    try: () => page.locator(selectorId).check(),
    catch: (e) =>
      new PageActionError({
        reason: `fillSearchPeriodField failed: period=${period}`,
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug(`filled search period field. period=${period}`);
});

// 現状は occupation と searchPeriod のみ対応。他（conditions, freeWord, ...）はあとまわし。
const fillJobCriteriaField = Effect.fn("fillJobCriteriaField")(function* (
  page: DetailedJobSearchPage,
  criteria: DetailedJobSearchCriteria,
) {
  const { desiredOccupation, searchPeriod } = criteria;
  if (desiredOccupation?.occupationSelection) {
    yield* fillOccupationField(page, desiredOccupation.occupationSelection);
  }
  if (searchPeriod) {
    yield* fillSearchPeriodField(page, searchPeriod);
  }
});

const clickSearchBtn = Effect.fn("clickSearchBtn")(function* (
  page: DetailedJobSearchPage,
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
        reason: "clickSearchBtn failed (detailed)",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug(
    "navigated to job list page from detailed job search page.",
  );
});

// ============================================================
// Public API
// ============================================================

// かんたん検索ページの「もっと詳しい条件を入力する」ボタンから詳細検索ページへページ遷移する。
// セレクタは要実機検証。
export const navigateToDetailedJobSearchPage = Effect.fn(
  "navigateToDetailedJobSearchPage",
)(function* (page: SimpleJobSearchPage) {
  yield* Effect.tryPromise({
    try: async () => {
      await Promise.all([
        page.waitForURL("**/kensaku/*.do"),
        page
          .getByRole("button", { name: "もっと詳しい条件を入力する" })
          .click(),
      ]);
    },
    catch: (e) =>
      new PageActionError({
        reason: "navigateToDetailedJobSearchPage failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  yield* Effect.logDebug("navigated to detailed job search page.");
  const _page: Page = page;
  return _page as DetailedJobSearchPage;
});

export const navigateByCriteria = Effect.fn("navigateByCriteriaDetailed")(
  function* (page: DetailedJobSearchPage, criteria: DetailedJobSearchCriteria) {
    yield* fillJobCriteriaField(page, criteria);
    yield* clickSearchBtn(page);
    const _page: Page = page;
    return _page as FirstJobListPage;
  },
);
