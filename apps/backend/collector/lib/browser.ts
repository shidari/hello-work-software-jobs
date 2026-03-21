import { Data, Effect, Layer } from "effect";
import { type Browser, chromium, type LaunchOptions } from "playwright";

export type { Locator, Page } from "playwright";

// ── Config (Context.Tag — ブラウザ設定) ──

export class PlaywrightBrowserConfig extends Effect.Service<PlaywrightBrowserConfig>()(
  "PlaywrightBrowserConfig",
  {
    succeed: {} as LaunchOptions,
  },
) {
  static dev = Layer.succeed(
    PlaywrightBrowserConfig,
    new PlaywrightBrowserConfig({ headless: false }),
  );
}

// ── Chromium (Effect.Service — エンジン提供) ──

export class PlaywrightChromium extends Effect.Service<PlaywrightChromium>()(
  "PlaywrightChromium",
  {
    effect: Effect.gen(function* () {
      const config = yield* PlaywrightBrowserConfig;
      return {
        launch: () => chromium.launch(config) as Promise<Browser>,
      };
    }),
    dependencies: [PlaywrightBrowserConfig.Default],
  },
) {}

// ── Browser / Page (Effect.fn — ライフサイクル管理) ──

class BrowserError extends Data.TaggedError("BrowserError")<{
  readonly message: string;
}> {}

export const openBrowserPage = Effect.fn("openBrowserPage")(function* () {
  const { launch } = yield* PlaywrightChromium;
  yield* Effect.logDebug("launching chromium browser...");
  const browser = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => launch(),
      catch: (e) =>
        new BrowserError({ message: `launch failed.\n${String(e)}` }),
    }),
    (browser) => Effect.promise(() => browser.close()),
  );
  const context = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => browser.newContext(),
      catch: (e) =>
        new BrowserError({ message: `newContext failed.\n${String(e)}` }),
    }),
    (context) => Effect.promise(() => context.close()),
  );
  return yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => context.newPage(),
      catch: (e) =>
        new BrowserError({ message: `newPage failed.\n${String(e)}` }),
    }),
    (page) => Effect.promise(() => page.close()),
  );
});
