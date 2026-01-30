import type { JobDetailPage } from "@sho/models";
import { Effect } from "effect";
import {
  HomePageElmNotFoundError,
  QualificationsElmNotFoundError,
} from "./error";

export function qualificationsElmExists(page: JobDetailPage) {
  const selector = "#ID_hynaMenkyoSkku";
  return Effect.tryPromise({
    try: async () => {
      const homePageLoc = page.locator(selector);
      const count = await homePageLoc.count();
      return count === 1;
    },
    catch: (e) =>
      new QualificationsElmNotFoundError({
        selector,
        currentUrl: page.url(),
        reason: `${e instanceof Error ? e.message : String(e)}`,
      }),
  }).pipe(
    Effect.tap((exists) => {
      if (!exists) {
        return Effect.logDebug(
          "Warning: Qualifications element not found on the page.",
        );
      }
      return Effect.logDebug("Qualifications element found on the page.");
    }),
  );
}

export function homePageElmExists(page: JobDetailPage) {
  const selector = "#ID_hp";
  return Effect.tryPromise({
    try: async () => {
      const homePageLoc = page.locator(selector);
      const count = await homePageLoc.count();
      return count === 1;
    },
    catch: (e) =>
      new HomePageElmNotFoundError({
        reason: `${e instanceof Error ? e.message : String(e)}`,
        currentUrl: page.url(),
        selector,
      }),
  }).pipe(
    Effect.tap((exists) => {
      if (!exists) {
        return Effect.logDebug(
          "Warning: Home page element not found on the page.",
        );
      }
      return Effect.logDebug("Home page element found on the page.");
    }),
  );
}
