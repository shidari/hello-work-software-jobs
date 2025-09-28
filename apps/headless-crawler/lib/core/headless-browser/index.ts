import { Effect } from "effect";
import {
  type Browser,
  type BrowserContext,
  type LaunchOptions,
  chromium,
} from "playwright";
import { LaunchBrowserError, NewContextError, NewPageError } from "./error";

export function launchBrowser(options: LaunchOptions) {
  return Effect.acquireRelease(
    Effect.gen(function* () {
      const browser = yield* Effect.tryPromise({
        try: () => chromium.launch({ ...options }),
        catch: (e) =>
          new LaunchBrowserError({
            message: `unexpected error.\n${String(e)}`,
          }),
      });
      return { browser };
    }),
    ({ browser }) => Effect.promise(() => browser.close()),
  )
    .pipe(Effect.map(({ browser }) => browser))
    .pipe(
      Effect.tap((b) => Effect.logDebug(`Browser launched: ${b.version()}`)),
    );
}

export function createContext(browser: Browser) {
  return Effect.acquireRelease(
    Effect.gen(function* () {
      const context = yield* Effect.tryPromise({
        try: () => browser.newContext(),
        catch: (e) =>
          new NewContextError({ message: `unexpetcted error.\n${String(e)}` }),
      });
      return { context };
    }),
    ({ context }) => Effect.promise(() => context.close()),
  )
    .pipe(Effect.map(({ context }) => context))
    .pipe(
      Effect.tap((c) =>
        Effect.logDebug(`BrowserContext created: ${c.browser()?.version()}`),
      ),
    );
}

export function createPage(context: BrowserContext) {
  return Effect.acquireRelease(
    Effect.gen(function* () {
      const page = yield* Effect.tryPromise({
        try: () => context.newPage(),
        catch: (e) =>
          new NewPageError({ message: `unexpected error.\n${String(e)}` }),
      });
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(200000);
      return { page };
    }),
    ({ page }) => Effect.promise(() => page.close()),
  )
    .pipe(Effect.map(({ page }) => page))
    .pipe(Effect.tap((p) => Effect.logDebug(`Page created: ${p.url()}`)));
}
