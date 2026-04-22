import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Console, Context, Data, Effect, Exit, Layer } from "effect";
import type { Browser, LaunchOptions } from "playwright-core";
import { chromium } from "playwright-core";
import type { SystemError } from "../error";

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
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  } satisfies LaunchOptions);
}

// ── DebugDumpConfig (Context.Tag — 失敗時 dump 設定) ──

export class DebugDumpConfig extends Context.Tag("DebugDumpConfig")<
  DebugDumpConfig,
  { readonly dir: string }
>() {
  /** 未実装マーカ — provide すると die する。環境ごとに dev/本番用 Layer に差し替える。 */
  static noop = Layer.effect(
    DebugDumpConfig,
    Effect.dieMessage("DebugDumpConfig.noop: not implemented"),
  );
  /** 開発・検証用。`.debug/` に dump。 */
  static dev = Layer.succeed(DebugDumpConfig, { dir: ".debug" });
}

// ── Debug helper: browser 内の全 page の HTML + screenshot を dump ──

const dumpBrowserPages = (browser: Browser) =>
  Effect.gen(function* () {
    const { dir } = yield* DebugDumpConfig;
    const pages = browser.contexts().flatMap((ctx) => ctx.pages());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    yield* Effect.promise(() => mkdir(dir, { recursive: true }));
    yield* Effect.forEach(pages, (page, i) => {
      const base = resolve(dir, `on-error-${stamp}-${i}`);
      return Effect.tryPromise({
        try: async () => {
          await writeFile(`${base}.html`, await page.content());
          await page.screenshot({ path: `${base}.png`, fullPage: true });
        },
        catch: (e) => e,
      }).pipe(
        Effect.andThen(Console.log(`dumped ${base}.{html,png}`)),
        Effect.catchAll((e) =>
          Console.error(`dump failed for ${base}: ${String(e)}`),
        ),
      );
    });
  });

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
    (browser: Browser) =>
      Console.log("closing browser...").pipe(
        Effect.andThen(Effect.promise(() => browser.close())),
      ),
  );
  // 失敗時のみ dump（finalizer は LIFO なので close より前に走る）
  yield* Effect.addFinalizer((exit) =>
    Exit.isFailure(exit) ? dumpBrowserPages(browser) : Effect.void,
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
