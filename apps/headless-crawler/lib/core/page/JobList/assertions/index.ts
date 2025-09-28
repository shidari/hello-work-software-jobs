import type { JobListPage } from "@sho/models";
import { Effect } from "effect";
import { listJobOverviewElem } from "../others";
import { AssertSingleJobListedError } from "./error";

export function assertSingleJobListed(page: JobListPage) {
  return Effect.gen(function* () {
    const jobOverViewList = yield* listJobOverviewElem(page);
    if (jobOverViewList.length !== 1)
      yield* Effect.logDebug(
        `failed to assert single job listed. job count=${jobOverViewList.length}`,
      );
    return yield* Effect.fail(
      new AssertSingleJobListedError({
        message: `job list count should be 1 but ${jobOverViewList.length}`,
      }),
    );
  });
}
