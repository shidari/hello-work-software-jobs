import { Context, Data, Effect, Layer } from "effect";
import { chromium, type LaunchOptions } from "playwright";

// Config
export class PlaywrightBrowserConfig extends Context.Tag(
  "PlaywrightBrowserConfig",
)<PlaywrightBrowserConfig, { readonly options: LaunchOptions }>() {
  static dev = Layer.succeed(PlaywrightBrowserConfig, {
    options: { headless: false },
  });

  static lambda = Layer.effect(
    PlaywrightBrowserConfig,
    Effect.gen(function* () {
      const chromiumModule = yield* Effect.tryPromise({
        try: () => import("@sparticuz/chromium").then((m) => m.default),
        catch: (e) =>
          new Error(`Failed to import @sparticuz/chromium: ${String(e)}`),
      });
      const executablePath = yield* Effect.tryPromise({
        try: () => chromiumModule.executablePath(),
        catch: (e) =>
          new Error(`Failed to get chromium executable path: ${String(e)}`),
      });
      return {
        options: {
          args: chromiumModule.args,
          executablePath,
        },
      };
    }),
  );
}

// Browser
class LaunchBrowserError extends Data.TaggedError("LaunchBrowserError")<{
  readonly message: string;
}> {}

export class PlaywrightChromiumBrowseResource extends Effect.Service<PlaywrightChromiumBrowseResource>()(
  "PlaywrightChromiumBrowseResource",
  {
    effect: Effect.gen(function* () {
      const config = yield* PlaywrightBrowserConfig;
      yield* Effect.logDebug("launching chromium browser...");
      yield* Effect.logDebug(
        `browser launch options: ${JSON.stringify(config.options, null, 2)}`,
      );
      const browser = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          const browser = yield* Effect.tryPromise({
            try: () => chromium.launch(config.options),
            catch: (e) =>
              new LaunchBrowserError({
                message: `unexpected error.\n${String(e)}`,
              }),
          });
          return browser;
        }),
        (browser) => Effect.promise(() => browser.close()),
      );
      return { browser };
    }),
  },
) {}

// Context
class NewContextError extends Data.TaggedError("NewContextError")<{
  readonly message: string;
}> {}

export class PlaywrightChromiumContextResource extends Effect.Service<PlaywrightChromiumContextResource>()(
  "PlaywrightChromiumContextResource",
  {
    effect: Effect.gen(function* () {
      const browserResource = yield* PlaywrightChromiumBrowseResource;
      const { browser } = browserResource;
      const context = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          const context = yield* Effect.tryPromise({
            try: () => browser.newContext(),
            catch: (e) =>
              new NewContextError({
                message: `unexpetcted error.\n${String(e)}`,
              }),
          });
          return context;
        }),
        (context) => Effect.promise(() => context.close()),
      );
      return { context };
    }),
    dependencies: [PlaywrightChromiumBrowseResource.Default],
  },
) {}

// Page
class NewPageError extends Data.TaggedError("NewPageError")<{
  readonly message: string;
}> {}

export class PlaywrightChromiumPageResource extends Effect.Service<PlaywrightChromiumPageResource>()(
  "PlaywrightChromiumPageResource",
  {
    effect: Effect.gen(function* () {
      const contextResource = yield* PlaywrightChromiumContextResource;
      const { context } = contextResource;
      const page = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          const page = yield* Effect.tryPromise({
            try: () => context.newPage(),
            catch: (e) =>
              new NewPageError({
                message: `unexpected error.\n${String(e)}`,
              }),
          });
          return page;
        }),
        (page) => Effect.promise(() => page.close()),
      );
      return { page };
    }),
    dependencies: [PlaywrightChromiumContextResource.Default],
  },
) {}
