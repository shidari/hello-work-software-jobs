import { Effect } from "effect";

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
