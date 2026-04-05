import { Console, Data, Effect, Layer } from "effect";
import { chromium, type LaunchOptions } from "playwright";
import type { SystemError } from "./error";

export type { Locator, Page } from "playwright";

// ── Errors ──

export class BrowserLaunchError extends Data.TaggedError(
  "BrowserLaunchError",
)<SystemError> {}

export class BrowserContextError extends Data.TaggedError(
  "BrowserContextError",
)<SystemError> {}

export class BrowserNewPageError extends Data.TaggedError(
  "BrowserNewPageError",
)<SystemError> {}

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
    Effect.tryPromise({
      try: () => chromium.launch(config),
      catch: (e) =>
        new BrowserLaunchError({
          reason: "chromium.launch failed",
          error: e instanceof Error ? e : new Error(String(e)),
        }),
    }),
    (browser) =>
      Console.log("closing browser...").pipe(
        Effect.andThen(Effect.promise(() => browser.close())),
      ),
  );
  yield* Console.log("browser launched, creating context...");
  const context = yield* Effect.tryPromise({
    try: () => browser.newContext(),
    catch: (e) =>
      new BrowserContextError({
        reason: "browser.newContext failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  return yield* Effect.tryPromise({
    try: () => context.newPage(),
    catch: (e) =>
      new BrowserNewPageError({
        reason: "context.newPage failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
});
