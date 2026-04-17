import { Console, Context, Data, Effect, Layer } from "effect";
import type { LaunchOptions } from "playwright-core";
import { chromium } from "playwright-core";
import type { SystemError } from "./error";

export type { Locator, Page } from "playwright-core";

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

// ── BrowserConfig (Context.Tag — playwright launch options) ──

export class ChromiumBrowserConfig extends Context.Tag("ChromiumBrowserConfig")<
  ChromiumBrowserConfig,
  LaunchOptions
>() {
  static lambda = Layer.effect(
    ChromiumBrowserConfig,
    Effect.tryPromise({
      try: async () => {
        const { default: mod } = await import("@sparticuz/chromium");
        return {
          executablePath: await mod.executablePath(),
          args: [
            ...mod.args,
            "--disable-gpu-shader-disk-cache",
            "--disk-cache-size=0",
            "--disk-cache-dir=/dev/null",
          ],
        } satisfies LaunchOptions;
      },
      catch: (e) =>
        new BrowserLaunchError({
          reason: "failed to resolve chromium config",
          error: e instanceof Error ? e : new Error(String(e)),
        }),
    }),
  );

  static dev = Layer.succeed(ChromiumBrowserConfig, {
    headless: false,
  } satisfies LaunchOptions);
}

// ── openBrowserPage (Effect.fn) ──

export const openBrowserPage = Effect.fn("openBrowserPage")(function* () {
  const config = yield* ChromiumBrowserConfig;
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
