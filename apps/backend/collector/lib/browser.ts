import { Console, Effect, Layer } from "effect";
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

export const openBrowserPage = Effect.fn("openBrowserPage")(function* () {
  const config = yield* PlaywrightBrowserConfig;
  yield* Console.log("launching chromium browser...");
  const browser = yield* Effect.acquireRelease(
    Effect.promise(() => chromium.launch(config)).pipe(Effect.orDie),
    (browser) =>
      Console.log("closing browser...").pipe(
        Effect.andThen(
          Effect.promise(() => browser.close()).pipe(Effect.orDie),
        ),
      ),
  );
  yield* Console.log("browser launched, creating context...");
  const context = yield* Effect.promise(() => browser.newContext()).pipe(
    Effect.orDie,
  );
  return yield* Effect.promise(() => context.newPage()).pipe(Effect.orDie);
});
