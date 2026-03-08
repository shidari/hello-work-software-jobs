import { Context, Data, Effect, Layer } from "effect";

// ── BrowserWorker 型 (Cloudflare Browser Rendering) ──

export type BrowserWorker = import("@cloudflare/playwright").BrowserWorker;

// ── 共通インターフェース ──
// @cloudflare/playwright と playwright で使うAPIは同じ。
// 型の衝突を避けるため、必要最小限のインターフェースを定義する。

interface Browser {
  newContext(): Promise<BrowserContext>;
  close(): Promise<void>;
}

interface BrowserContext {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}

export interface Page {
  goto(
    url: string,
    options?: {
      waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
    },
  ): Promise<unknown>;
  url(): string;
  content(): Promise<string>;
  locator(selector: string, options?: { hasText?: string | RegExp }): Locator;
  waitForURL(url: string | RegExp): Promise<void>;
  close(): Promise<void>;
}

export interface Locator {
  click(): Promise<void>;
  check(): Promise<void>;
  fill(value: string): Promise<void>;
  isDisabled(): Promise<boolean>;
  selectOption(value: string): Promise<string[]>;
  textContent(): Promise<string | null>;
  evaluate(fn: (el: Element) => void): Promise<void>;
  first(): Locator;
  nth(index: number): Locator;
  all(): Promise<Locator[]>;
  locator(selector: string, options?: { hasText?: string | RegExp }): Locator;
}

// ── Config (Context.Tag — 環境切り替え) ──

type CloudflareConfig = {
  readonly mode: "cloudflare";
  readonly binding: BrowserWorker;
};
type DevConfig = { readonly mode: "dev"; readonly headless: boolean };

export class PlaywrightBrowserConfig extends Context.Tag(
  "PlaywrightBrowserConfig",
)<PlaywrightBrowserConfig, CloudflareConfig | DevConfig>() {
  static dev = Layer.succeed(PlaywrightBrowserConfig, {
    mode: "dev" as const,
    headless: false,
  });

  static cloudflare = (binding: BrowserWorker) =>
    Layer.succeed(PlaywrightBrowserConfig, {
      mode: "cloudflare" as const,
      binding,
    });
}

// ── Browser (Effect.Service — dev/cloudflare 切り替え) ──

class LaunchBrowserError extends Data.TaggedError("LaunchBrowserError")<{
  readonly message: string;
}> {}

export class PlaywrightChromiumBrowser extends Effect.Service<PlaywrightChromiumBrowser>()(
  "PlaywrightChromiumBrowser",
  {
    effect: Effect.gen(function* () {
      const config = yield* PlaywrightBrowserConfig;
      yield* Effect.logDebug(
        `launching chromium browser... mode=${config.mode}`,
      );
      const browser = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          if (config.mode === "cloudflare") {
            const cfPlaywright = yield* Effect.tryPromise({
              try: () => import("@cloudflare/playwright"),
              catch: (e) =>
                new LaunchBrowserError({
                  message: `Failed to import @cloudflare/playwright: ${String(e)}`,
                }),
            });
            return yield* Effect.tryPromise({
              try: () =>
                cfPlaywright.launch(config.binding) as Promise<Browser>,
              catch: (e) =>
                new LaunchBrowserError({
                  message: `unexpected error.\n${String(e)}`,
                }),
            });
          }
          // dev mode: regular playwright
          const { chromium } = yield* Effect.tryPromise({
            try: () => import("playwright"),
            catch: (e) =>
              new LaunchBrowserError({
                message: `Failed to import playwright: ${String(e)}`,
              }),
          });
          return yield* Effect.tryPromise({
            try: () =>
              chromium.launch({
                headless: config.headless,
              }) as Promise<Browser>,
            catch: (e) =>
              new LaunchBrowserError({
                message: `unexpected error.\n${String(e)}`,
              }),
          });
        }),
        (browser) => Effect.promise(() => browser.close()),
      );
      return { browser };
    }),
  },
) {}

// ── Context / Page (Effect.fn — 手続き的リソース生成) ──

class NewContextError extends Data.TaggedError("NewContextError")<{
  readonly message: string;
}> {}

class NewPageError extends Data.TaggedError("NewPageError")<{
  readonly message: string;
}> {}

export const openBrowserPage = Effect.fn("openBrowserPage")(function* () {
  const { browser } = yield* PlaywrightChromiumBrowser;
  const context = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => browser.newContext(),
      catch: (e) =>
        new NewContextError({
          message: `unexpected error.\n${String(e)}`,
        }),
    }),
    (context) => Effect.promise(() => context.close()),
  );
  return yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => context.newPage(),
      catch: (e) =>
        new NewPageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    }),
    (page) => Effect.promise(() => page.close()),
  );
});
