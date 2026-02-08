import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import {
  goToJobSearchPage,
  searchNoThenGotoSingleJobListPage,
} from "../../core/page/JobSearch/navigations";
import { validateJobSearchPage } from "../../core/page/JobSearch/validators";
import { validateJobListPage } from "../../core/page/JobList/validators";
import { goToSingleJobDetailPage } from "../../core/page/JobList/navigations";
import { validateJobDetailPage } from "../helpers/validators";
import { ExtractJobDetailRawHtmlError } from "./error";
import { format } from "date-fns";
import { PlaywrightChromiumPageResource } from "../../core/headless-browser";

const i = Symbol();
type ISODateString = string & { [i]: never };

const nowISODateString = (): ISODateString =>
  format(new Date(), "yyyy-MM-dd") as ISODateString;

export class Extractor extends Effect.Service<Extractor>()(
  "jobDetail/extractor",
  {
    effect: Effect.gen(function* () {
      const pageResource = yield* PlaywrightChromiumPageResource;
      const extractRawHtml = Effect.fn("extractRawHtml")(function* (
        jobNumber: JobNumber,
      ) {
        const { page } = pageResource;
        yield* Effect.logInfo("start extracting raw job detail HTML...");
        yield* Effect.logDebug("go to hello work seach page.");
        yield* goToJobSearchPage(page);
        const searchPage = yield* validateJobSearchPage(page);
        yield* Effect.logDebug(
          "fill jobNumber then go to hello work seach page.",
        );
        yield* searchNoThenGotoSingleJobListPage(searchPage, jobNumber);
        const jobListPage = yield* validateJobListPage(searchPage);
        yield* Effect.logDebug("now on job List page.");

        yield* goToSingleJobDetailPage(jobListPage);
        const jobDetailPage = yield* validateJobDetailPage(jobListPage);
        const rawHtml = yield* Effect.tryPromise({
          try: () => jobDetailPage.content(),
          catch: (error) =>
            new ExtractJobDetailRawHtmlError({
              jobNumber,
              currentUrl: jobDetailPage.url(),
              reason: `${error instanceof Error ? error.message : String(error)}`,
            }),
        });
        return { rawHtml, fetchedDate: nowISODateString(), jobNumber };
      });
      return { extractRawHtml };
    }),
    dependencies: [PlaywrightChromiumPageResource.Default],
  },
) {}
