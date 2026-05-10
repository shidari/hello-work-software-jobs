import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Console, Context, Data, Effect, Exit, Layer } from "effect";
import type { Browser, LaunchOptions, Page } from "playwright-core";
import { chromium } from "playwright-core";
import type { SystemError } from "../error";

export type { Locator, Page } from "playwright-core";

// ── Errors ──

class BrowserLaunchError extends Data.TaggedError(
  "BrowserLaunchError",
)<SystemError> {}

class BrowserContextError extends Data.TaggedError(
  "BrowserContextError",
)<SystemError> {}

class BrowserNewPageError extends Data.TaggedError(
  "BrowserNewPageError",
)<SystemError> {}

class PageRouterError extends Data.TaggedError(
  "PageRouterError",
)<SystemError> {}

// ── PageSnapshot — 1 ページの URL + HTML をまとめた dump / fixture の単位 ──

export type PageSnapshot = {
  readonly url: string;
  readonly html: string;
};

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

// ── Mode (Context.Tag — 実行コンテキストごとの設定を一元化) ──
// production: 本番 Lambda。何も書かない・何も注入しない。
// dev: ローカル / verify スクリプト。失敗時に dumpDir 配下に HTML+screenshot を吐く。
// test: テスト。snapshots を URL マッチで page.route に流す（実ネットワーク到達なし）。

type ModeValue =
  | { readonly kind: "production" }
  | { readonly kind: "dev"; readonly dumpDir: string }
  | { readonly kind: "test"; readonly snapshots: readonly PageSnapshot[] };

export class Mode extends Context.Tag("Mode")<Mode, ModeValue>() {
  static production = Layer.succeed(Mode, {
    kind: "production",
  } satisfies ModeValue);

  static dev = Layer.sync(Mode, () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return {
      kind: "dev",
      dumpDir: resolve(".debug", `run-${stamp}`),
    } as const;
  });

  static test = (snapshots: readonly PageSnapshot[]) =>
    Layer.succeed(Mode, { kind: "test", snapshots } satisfies ModeValue);
}

// ── dumpPage (1 枚の Page を dir 配下に HTML + screenshot + 参照 CSS で dump) ──
// label にどのページか分かる短い名前を渡す。ファイル名は `{stamp}-{label}.{html,png}`。
// 参照されている <link rel="stylesheet"> は browser コンテキスト経由で fetch し、
// URL の pathname をそのまま dir 配下に再現して保存する（rewrite 後の HTML から file:// 開いた時にスタイルが当たる）。
// dev mode の時だけ実体が走る。

const downloadStylesheets = async (page: Page, dir: string) => {
  // (rawHref, absUrl) を取り出す。DOM は変更しない（同じページに 2 度 dump された時の二重 rewrite を避ける）。
  const links = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    )
      .map((l) => ({
        rawHref: l.getAttribute("href") ?? "",
        absUrl: l.href,
      }))
      .filter(({ rawHref, absUrl }) => rawHref && absUrl);
  });

  const ctx = page.context();
  for (const { rawHref, absUrl } of links) {
    // 相対 href のみ扱う。絶対 URL や root-relative は HelloWork 側で出てこないので skip。
    if (/^(?:https?:|\/)/.test(rawHref)) continue;
    try {
      const fullPath = join(dir, rawHref);
      // dir 配下から escape する `..` を含むパスは弾く。
      const dirWithSep = dir.endsWith("/") ? dir : `${dir}/`;
      if (!fullPath.startsWith(dirWithSep)) continue;
      await mkdir(dirname(fullPath), { recursive: true });
      const response = await ctx.request.get(absUrl);
      if (!response.ok()) {
        console.warn(
          `dumpPage: CSS fetch failed (${response.status()}): ${absUrl}`,
        );
        continue;
      }
      await writeFile(fullPath, await response.body());
    } catch (e) {
      console.warn(`dumpPage: CSS fetch error: ${absUrl}: ${String(e)}`);
    }
  }
};

const dumpPageToDir = (page: Page, dir: string, label: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
  const base = resolve(dir, `${stamp}-${safeLabel}`);
  return Effect.promise(() => mkdir(dir, { recursive: true })).pipe(
    Effect.andThen(
      Effect.tryPromise({
        try: async () => {
          await page.screenshot({ path: `${base}.png`, fullPage: true });
          await downloadStylesheets(page, dir);
          await writeFile(`${base}.html`, await page.content());
        },
        catch: (e) => e,
      }),
    ),
    Effect.andThen(Console.log(`dumped ${base}.{html,png} + css/`)),
    Effect.catchAll((e) =>
      Console.error(`dump failed for ${base}: ${String(e)}`),
    ),
  );
};

export const dumpPage = (page: Page, label: string) =>
  Effect.gen(function* () {
    const mode = yield* Mode;
    if (mode.kind !== "dev") return;
    yield* dumpPageToDir(page, mode.dumpDir, label);
  });

// ── dumpBrowserPage (browser 内の全 page を一斉に dump) ──

const dumpBrowserPage = (browser: Browser, label: string) =>
  Effect.gen(function* () {
    const mode = yield* Mode;
    if (mode.kind !== "dev") return;
    const pages = browser.contexts().flatMap((ctx) => ctx.pages());
    yield* Effect.forEach(pages, (page, i) =>
      dumpPageToDir(page, mode.dumpDir, `${label}-${i}`),
    );
  });

// ── setupTestRoutes (test mode 用 — page.route で snapshots を URL マッチ配信) ──

const setupTestRoutes = (page: Page, snapshots: readonly PageSnapshot[]) =>
  Effect.tryPromise({
    try: () =>
      page.route("**/*", async (route) => {
        const snapshot = snapshots.find((s) => s.url === route.request().url());
        if (snapshot) {
          await route.fulfill({
            contentType: "text/html",
            body: snapshot.html,
          });
        } else {
          await route.abort();
        }
      }),
    catch: (e) =>
      new PageRouterError({
        reason: "page.route registration failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
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
  const page = yield* Effect.tryPromise({
    try: () => context.newPage(),
    catch: (e) =>
      new BrowserNewPageError({
        reason: "context.newPage failed",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
  const mode = yield* Mode;
  if (mode.kind === "test") yield* setupTestRoutes(page, mode.snapshots);
  return page;
});
