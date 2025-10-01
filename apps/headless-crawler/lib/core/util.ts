import { Effect } from "effect";
import type * as v from "valibot";
export function delay(ms: number) {
  return Effect.promise<void>(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, ms);
      }),
  );
}
export const issueToLogString = (issue: v.ObjectIssue | v.StringIssue | v.RegexIssue<string> | v.UrlIssue<string> | v.MinLengthIssue<string, number>) => {
  const { received, expected, message } = issue
  return `received: ${received}\nexpected: ${expected}\nmessage: ${message}`
}