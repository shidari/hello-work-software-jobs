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
  });
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
  });
}
