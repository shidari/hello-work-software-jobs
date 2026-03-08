import { Data, Effect, Layer } from "effect";
import type { LaunchOptions } from "playwright";

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

class ImportError extends Data.TaggedError("ImportError")<{
  readonly message: string;
}> {}

export class PlaywrightChromium extends Effect.Service<PlaywrightChromium>()(
  "PlaywrightChromium",
  {
    effect: Effect.gen(function* () {
      const { chromium } = yield* Effect.tryPromise({
        try: () => import("playwright"),
        catch: (e) =>
          new ImportError({
            message: `Failed to import playwright: ${String(e)}`,
          }),
      });
      const config = yield* PlaywrightBrowserConfig;
      return {
        launch: () => chromium.launch(config) as Promise<Browser>,
      };
    }),
    dependencies: [PlaywrightBrowserConfig.Default],
  },
) {
  static cloudflare(binding: BrowserWorker) {
    return Layer.effect(
      PlaywrightChromium,
      Effect.gen(function* () {
        const cfPlaywright = yield* Effect.tryPromise({
          try: () => import("@cloudflare/playwright"),
          catch: (e) =>
            new ImportError({
              message: `Failed to import @cloudflare/playwright: ${String(e)}`,
            }),
        });
        return new PlaywrightChromium({
          launch: () => cfPlaywright.launch(binding) as Promise<Browser>,
        });
      }),
    );
  }
}

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
