import {
  type JobListPage,
  type JobOverViewList,
  jobNumberSchema,
} from "@sho/models";
import { Effect } from "effect";
import * as v from "valibot";
import { JobNumberValidationError } from "../../../jobDetail/helpers/validators/error";
import { issueToLogString } from "../../../util";
import { IsNextPageEnabledError, ListJobsError } from "./error";
export function listJobOverviewElem(
  jobListPage: JobListPage,
): Effect.Effect<JobOverViewList, ListJobsError, never> {
  return Effect.tryPromise({
    try: () => jobListPage.locator("table.kyujin.mt1.noborder").all(),
    catch: (e) =>
      new ListJobsError({ message: `unexpected error.\n${String(e)}` }),
  })
    .pipe(
      Effect.flatMap((tables) =>
        tables.length === 0
          ? Effect.fail(new ListJobsError({ message: "jobOverList is empty." }))
          : Effect.succeed(tables as JobOverViewList),
      ),
    )
    .pipe(
      Effect.tap((jobOverViewList) => {
        return Effect.logDebug(
          `succeeded to list job overview elements. count=${jobOverViewList.length}`,
        );
      }),
    );
}

export function isNextPageEnabled(page: JobListPage) {
  return Effect.tryPromise({
    try: async () => {
      const nextPageBtn = page.locator('input[value="次へ＞"]').first();
      return !(await nextPageBtn.isDisabled());
    },
    catch: (e) => {
      console.error(e);
      return new IsNextPageEnabledError({
        message: `unexpected error. ${String(e)}`,
      });
    },
  }).pipe(
    Effect.tap((enabled) => {
      return Effect.logDebug(`is next page enabled: ${enabled}`);
    }),
  );
}

export function validateJobNumber(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateJobNumber. args={val:${JSON.stringify(val, null, 2)}}`,
    );
    const result = v.safeParse(jobNumberSchema, val);
    if (!result.success) {
      yield* Effect.logDebug(
        `succeeded to validate jobNumber. val=${JSON.stringify(
          result.output,
          null,
          2,
        )}`,
      );
      return yield* Effect.fail(
        new JobNumberValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}
