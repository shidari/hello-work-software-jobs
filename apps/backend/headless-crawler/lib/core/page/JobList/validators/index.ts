import type { JobListPage } from "@sho/models";
import { Effect } from "effect";
import type { Page } from "playwright";
import { JobListPageValidationError } from "./error";

export function validateJobListPage(page: Page) {
  return Effect.tryPromise({
    try: async () => {
      return page.locator(".kyujin").count();
    },
    catch: (e) =>
      new JobListPageValidationError({
        message: `unexpected error. ${String(e)}`,
      }),
  })
    .pipe(
      Effect.flatMap((pageCount) =>
        pageCount === 0
          ? Effect.fail(
              new JobListPageValidationError({
                message: "job list is empty. maybe job not found.",
              }),
            )
          : Effect.succeed(page as JobListPage),
      ),
    )
    .pipe(
      Effect.tap((_) => {
        return Effect.logDebug("succeeded to validate job list page.");
      }),
    );
}
