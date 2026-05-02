import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Console, Context, Data, Effect, Exit, Layer } from "effect";
import type { Browser, LaunchOptions, Page } from "playwright-core";
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

// ── DebugMode (Context.Tag — enabled なら dumpPage / dumpBrowserPage が dir に dump する) ──
// dev では .debug/run-{stamp}/ をその run 用のサブディレクトリとして払い出し、
// 同じ run のダンプが時系列で 1 箇所にまとまるようにする。

export type DebugModeValue =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly dir: string };

export class DebugMode extends Context.Tag("DebugMode")<
  DebugMode,
  DebugModeValue
>() {
  static dev = Layer.sync(DebugMode, () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return {
      enabled: true,
      dir: resolve(".debug", `run-${stamp}`),
    } as const;
  });
  static main = Layer.succeed(DebugMode, {
    enabled: false,
  } satisfies DebugModeValue);
}

// ── dumpPage (1 枚の Page を dir 配下に HTML + screenshot で dump) ──
// label にどのページか分かる短い名前を渡す。ファイル名は `{stamp}-{label}.{html,png}`。

const dumpPageToDir = (page: Page, dir: string, label: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
  const base = resolve(dir, `${stamp}-${safeLabel}`);
  return Effect.promise(() => mkdir(dir, { recursive: true })).pipe(
    Effect.andThen(
      Effect.tryPromise({
        try: async () => {
          await writeFile(`${base}.html`, await page.content());
          await page.screenshot({ path: `${base}.png`, fullPage: true });
        },
        catch: (e) => e,
      }),
    ),
    Effect.andThen(Console.log(`dumped ${base}.{html,png}`)),
    Effect.catchAll((e) =>
      Console.error(`dump failed for ${base}: ${String(e)}`),
    ),
  );
};

export const dumpPage = (page: Page, label: string) =>
  Effect.gen(function* () {
    const debug = yield* DebugMode;
    if (!debug.enabled) return;
    yield* dumpPageToDir(page, debug.dir, label);
  });

// ── dumpBrowserPage (browser 内の全 page を一斉に dump) ──

export const dumpBrowserPage = (browser: Browser, label: string) =>
  Effect.gen(function* () {
    const debug = yield* DebugMode;
    if (!debug.enabled) return;
    const pages = browser.contexts().flatMap((ctx) => ctx.pages());
    yield* Effect.forEach(pages, (page, i) =>
      dumpPageToDir(page, debug.dir, `${label}-${i}`),
    );
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
    Exit.isFailure(exit) ? dumpBrowserPage(browser, "on-error") : Effect.void,
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
