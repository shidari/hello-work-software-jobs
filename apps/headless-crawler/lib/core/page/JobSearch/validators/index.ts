import type { JobSearchPage } from "@sho/models";
import { Effect } from "effect";
import type { Page } from "playwright";
import { JobSearchPageValidationError } from "./error";

export function validateJobSearchPage(page: Page) {
  return Effect.gen(function* () {
    const url = page.url();
    if (!url.includes("kensaku"))
      yield* Effect.fail(
        new JobSearchPageValidationError({
          message: `not on job search page.\nurl=${url}`,
        }),
      );
    const jobSearchPage = yield* Effect.tryPromise({
      try: async () => {
        return page as JobSearchPage;
      },
      catch: (e) =>
        new JobSearchPageValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    return jobSearchPage;
  });
}
