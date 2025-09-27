import type { JobListPage, JobOverViewList } from "@sho/models";
import { Effect } from "effect";
import { IsNextPageEnabledError, ListJobsError } from "./error";

export function listJobOverviewElem(
    jobListPage: JobListPage,
): Effect.Effect<JobOverViewList, ListJobsError, never> {
    return Effect.tryPromise({
        try: () => jobListPage.locator("table.kyujin.mt1.noborder").all(),
        catch: (e) =>
            new ListJobsError({ message: `unexpected error.\n${String(e)}` }),
    }).pipe(
        Effect.flatMap((tables) =>
            tables.length === 0
                ? Effect.fail(new ListJobsError({ message: "jobOverList is empty." }))
                : Effect.succeed(tables as JobOverViewList),
        ),
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
    });
}
