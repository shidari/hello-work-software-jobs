import type { JobOverViewList } from "@sho/models";
import { Effect } from "effect";
import { ExtractJobNumbersError } from "./error";
import { validateJobNumber } from "../../others";

export function extractJobNumbers(jobOverviewList: JobOverViewList) {
    return Effect.forEach(jobOverviewList, (table) => {
        return Effect.gen(function* () {
            const rawJobNumber = yield* Effect.tryPromise({
                try: async () => {
                    const text = await table
                        .locator("div.right-side")
                        .locator("tr")
                        .nth(3)
                        .locator("td")
                        .nth(1)
                        .textContent();
                    return text;
                },
                catch: (e) =>
                    new ExtractJobNumbersError({
                        message: `unexpected error. ${String(e)}`,
                    }),
            }).pipe(
                Effect.tap((raw) => {
                    if (raw === null) {
                        return Effect.logDebug("Warning: jobNumber textContent is null");
                    }
                    return Effect.logDebug(`rawJobNumber=${raw}`);
                }),
            );
            if (rawJobNumber === null) {
                return yield* Effect.fail(
                    new ExtractJobNumbersError({ message: "jobNumber is null" }),
                );
            }
            const trimedRawJobNumber = rawJobNumber.trim();
            const jobNumber = yield* validateJobNumber(trimedRawJobNumber);
            return jobNumber;
        });
    });
}