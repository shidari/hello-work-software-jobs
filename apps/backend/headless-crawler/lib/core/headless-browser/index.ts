import { Effect } from "effect";
import { type LaunchOptions, chromium } from "playwright";
import { LaunchBrowserError, NewContextError, NewPageError } from "./error";

export class PlaywrightBrowserConfig extends Effect.Service<PlaywrightBrowserConfig>()(
  "PlaywrightBrowserConfig",
  {
    // Define how to create the service
    effect: Effect.sync(() => {
      const options: LaunchOptions = {};
      return { options };
    }),
  },
) {
  static dev = new PlaywrightBrowserConfig({
    options: {
      headless: false,
    },
  });
}

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
    dependencies: [PlaywrightBrowserConfig.Default],
  },
) {}

class PlaywrightChromiumContextResource extends Effect.Service<PlaywrightChromiumContextResource>()(
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
              new NewPageError({ message: `unexpected error.\n${String(e)}` }),
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
