import { Data, Effect } from "effect";

import type {
  JobListPage,
  JobNumber,
  JobSearchCriteria,
  JobSearchPage,
} from "@sho/models";
import type { Page } from "playwright";
import { assertSingleJobListed } from "../../assertion";
import { fillJobCriteriaField, fillJobNumber } from "../form-filling/jobSearch";
import {
  GoToJobSearchPageError,
  NextJobListPageError,
  SearchThenGotoFirstJobListPageError,
  SearchThenGotoJobListPageError,
} from "./error";

export function goToNextJobListPage(page: JobListPage) {
  return Effect.tryPromise({
    try: async () => {
      const nextButton = page.locator('input[value="次へ＞"]').first();
      await nextButton.click();
      return page;
    },
    catch: (e) =>
      new NextJobListPageError({ message: `unexpected error.\n${String(e)}` }),
  });
}

export function goToJobSearchPage(page: Page) {
  return Effect.tryPromise({
    try: async () => {
      await page.goto(
        "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010",
      );
    },
    catch: (e) =>
      new GoToJobSearchPageError({
        message: `unexpected error.\n${String(e)}`,
      }),
  });
}

export function searchThenGotoJobListPage(
  page: JobSearchPage,
  searchFilter: JobSearchCriteria,
) {
  return Effect.gen(function* () {
    yield* fillJobCriteriaField(page, searchFilter);
    yield* Effect.tryPromise({
      try: async () => {
        const searchBtn = page.locator("#ID_searchBtn");

        await Promise.all([
          page.waitForURL("**/kensaku/*.do"),
          searchBtn.click(),
        ]);
      },
      catch: (e) =>
        new SearchThenGotoJobListPageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
  });
}
export function searchNoThenGotoSingleJobListPage(
  page: JobSearchPage,
  jobNumber: JobNumber,
) {
  return Effect.gen(function* () {
    yield* fillJobNumber(page, jobNumber);
    yield* Effect.tryPromise({
      try: async () => {
        const searchNoBtn = page.locator("#ID_searchNoBtn");
        await Promise.all([
          page.waitForURL("**/kensaku/*.do"),
          searchNoBtn.click(),
        ]);
      },
      catch: (e) =>
        new SearchThenGotoFirstJobListPageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
  });
}

// どこに仕分ければいいかわからないので、一旦直書き
export class FromJobListToJobDetailPageError extends Data.TaggedError(
  "FromJobListToJobDetailPageError",
)<{
  readonly message: string;
}> {}

export function goToSingleJobDetailPage(page: JobListPage) {
  return Effect.gen(function* () {
    // 求人一覧ページに飛ぶが、番号検索なので1件のみ一致なはず、それを一旦チェックする
    yield* assertSingleJobListed(page);
    yield* Effect.tryPromise({
      try: async () => {
        // 一件しかないことをアサートしてるので
        const showDetailBtn = page.locator("#ID_dispDetailBtn").first();
        // 新しいタブを開かないようにtarget属性を消す
        showDetailBtn.evaluate((elm) => elm.removeAttribute("target"));
        await showDetailBtn.click();
      },
      catch: (e) =>
        new FromJobListToJobDetailPageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
  });
}
