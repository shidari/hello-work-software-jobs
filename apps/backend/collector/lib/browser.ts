import { Console, Data, Effect, Layer } from "effect";
import { chromium, type LaunchOptions } from "playwright";

export type { Locator, Page } from "playwright";

// ── Config (Context.Tag — ブラウザ設定) ──

export class PlaywrightBrowserConfig extends Effect.Tag(
  "PlaywrightBrowserConfig",
)<PlaywrightBrowserConfig, LaunchOptions>() {
  static main = Layer.succeed(PlaywrightBrowserConfig, {});
  static dev = Layer.succeed(PlaywrightBrowserConfig, { headless: false });
}

// ── Browser / Page (Effect.fn — ライフサイクル管理) ──

class BrowserError extends Data.TaggedError("BrowserError")<{
  readonly message: string;
  readonly error?: unknown;
}> {}

export const openBrowserPage = Effect.fn("openBrowserPage")(function* () {
  const config = yield* PlaywrightBrowserConfig;
  yield* Console.log(
    `PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH ?? "(unset)"}`,
  );
  yield* Console.log(`chromium.executablePath=${chromium.executablePath()}`);
  yield* Console.log("launching chromium browser...");
  const browser = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => chromium.launch(config),
      catch: (error) => new BrowserError({ message: "launch failed", error }),
    }),
    (browser) =>
      Console.log("closing browser...").pipe(
        Effect.andThen(
          Effect.tryPromise(() => browser.close()).pipe(Effect.orDie),
        ),
      ),
  );
  yield* Console.log("browser launched, creating context...");
  const context = yield* Effect.tryPromise({
    try: () => browser.newContext(),
    catch: (error) => new BrowserError({ message: "newContext failed", error }),
  });
  yield* Console.log("context created, opening page...");
  return yield* Effect.tryPromise({
    try: () => context.newPage(),
    catch: (error) => new BrowserError({ message: "newPage failed", error }),
  });
});
