
import { Effect } from "effect"
import { ImportChromiumError } from "../../core/headless-browser/error"

export class Chromium extends Effect.Service<Chromium>()("resource/chromium", {
  // デフォルトはサーバーレスのchromium
  effect: Effect.gen(function* () {
    const chromium = yield* Effect.tryPromise({
      try: async () => {
        const chromium = await import("@sparticuz/chromium").then((mod) => mod.default)
        return chromium
      },
      catch: (error) =>
        new ImportChromiumError({
          message: `Failed to import chromium: ${String(error)}`,
        }),
    })
    return chromium
  }),
}) { }