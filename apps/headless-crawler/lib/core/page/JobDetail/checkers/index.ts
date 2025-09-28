import type { JobDetailPage } from "@sho/models";
import { Effect } from "effect";
import {
  HomePageElmNotFoundError,
  QualificationsElmNotFoundError,
} from "./error";

export function qualificationsElmExists(page: JobDetailPage) {
  return Effect.tryPromise({
    try: async () => {
      const homePageLoc = page.locator("#ID_hynaMenkyoSkku");
      const count = await homePageLoc.count();
      return count === 1;
    },
    catch: (e) =>
      new QualificationsElmNotFoundError({
        message: `unexpected error\n${String(e)}`,
      }),
  }).pipe(Effect.tap((exists) => {
    if (!exists) {
      return Effect.logDebug(
        "Warning: Qualifications element not found on the page."
      );
    }
    return Effect.logDebug("Qualifications element found on the page.");
  }));
}

export function homePageElmExists(page: JobDetailPage) {
  return Effect.tryPromise({
    try: async () => {
      const homePageLoc = page.locator("#ID_hp");
      const count = await homePageLoc.count();
      return count === 1;
    },
    catch: (e) =>
      new HomePageElmNotFoundError({
        message: `unexpected error\n${String(e)}`,
      }),
  }).pipe(Effect.tap((exists) => {
    if (!exists) {
      return Effect.logDebug("Warning: Home page element not found on the page.");
    }
    return Effect.logDebug("Home page element found on the page.");
  }));
}
