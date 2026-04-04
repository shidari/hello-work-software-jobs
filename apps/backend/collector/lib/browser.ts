import { Console, Data, Effect, Layer } from "effect";
import { chromium, type LaunchOptions } from "playwright";

export type { Locator, Page } from "playwright";

// ── Errors ──

export class BrowserLaunchError extends Data.TaggedError("BrowserLaunchError")<{
  readonly message: string;
  readonly error: unknown;
}> {}

export class BrowserContextError extends Data.TaggedError(
  "BrowserContextError",
)<{
  readonly message: string;
  readonly error: unknown;
}> {}

export class BrowserNewPageError extends Data.TaggedError(
  "BrowserNewPageError",
)<{
  readonly message: string;
  readonly error: unknown;
}> {}

// ── Config (Context.Tag — ブラウザ設定) ──

export class PlaywrightBrowserConfig extends Effect.Tag(
  "PlaywrightBrowserConfig",
)<PlaywrightBrowserConfig, LaunchOptions>() {
  static lambda = Layer.succeed(PlaywrightBrowserConfig, {
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  });
  static dev = Layer.succeed(PlaywrightBrowserConfig, { headless: false });
}

// ── Browser / Page (Effect.fn — ライフサイクル管理) ──

export const openBrowserPage = Effect.fn("openBrowserPage")(function* () {
  const config = yield* PlaywrightBrowserConfig;
  yield* Console.log("launching chromium browser...");
  const browser = yield* Effect.acquireRelease(
    Effect.orDieWith(
      Effect.tryPromise({
        try: () => chromium.launch(config),
        catch: (error) =>
          new BrowserLaunchError({ message: "chromium.launch failed", error }),
      }),
      (e) =>
        new Error(
          `failed to launch browser: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
        ),
    ),
    (browser) =>
      Console.log("closing browser...").pipe(
        Effect.andThen(
          Effect.promise(() => browser.close()).pipe(Effect.orDie),
        ),
      ),
  );
  yield* Console.log("browser launched, creating context...");
  const context = yield* Effect.orDieWith(
    Effect.tryPromise({
      try: () => browser.newContext(),
      catch: (error) =>
        new BrowserContextError({
          message: "browser.newContext failed",
          error,
        }),
    }),
    (e) =>
      new Error(
        `failed to create context: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
  return yield* Effect.orDieWith(
    Effect.tryPromise({
      try: () => context.newPage(),
      catch: (error) =>
        new BrowserNewPageError({
          message: "context.newPage failed",
          error,
        }),
    }),
    (e) =>
      new Error(
        `failed to create new page: ${e.message}, original error: ${e.error instanceof Error ? e.error.message : JSON.stringify(e.error)}`,
      ),
  );
});
