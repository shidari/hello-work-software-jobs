import type { JobNumber, JobSearchCriteria, JobSearchPage } from "@sho/models";
import { Effect } from "effect";
import type { Page } from "playwright";
import { fillJobCriteriaField, fillJobNumber } from "../form-fillings";
import {
  GoToJobSearchPageError,
  SearchThenGotoFirstJobListPageError,
  SearchThenGotoJobListPageError,
} from "./error";

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
  }).pipe(
    Effect.tap(() => {
      return Effect.logDebug("navigated to job search page.");
    }),
  );
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
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(
          "navigated to job list page from job search page.",
        );
      }),
    );
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
    }).pipe(
      Effect.tap(() => {
        return Effect.logDebug(
          "navigated to job list page from job search page.",
        );
      }),
    );
  });
}

// どこに仕分ければいいかわからないので、一旦直書き
