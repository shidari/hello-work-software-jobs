/**
 * 検索結果ページのHTMLをダンプし、セレクタの一致状況を表示する診断ツール。
 *
 * Usage:
 *   pnpm verify:dump-html
 */

import { Effect, Logger, LogLevel } from "effect";
import { ChromiumBrowserConfig, DebugDumpConfig } from "../browser";
import { navigateByCriteria, openJobSearchPage } from "../page/search";

async function main() {
  const program = Effect.scoped(
    Effect.gen(function* () {
      const jobSearchPage = yield* openJobSearchPage();
      const firstJobListPage = yield* navigateByCriteria(jobSearchPage, {
        desiredOccupation: {
          occupationSelection: "ソフトウェア開発技術者、プログラマー",
        },
      });
      const html = yield* Effect.tryPromise({
        try: () => firstJobListPage.content(),
        catch: (e) => new Error(`Failed to get content: ${String(e)}`),
      });
      console.log(html);

      const selectors = [
        "table.kyujin.mt1.noborder",
        "table.kyujin",
        "table",
        "button.qr_btn[data-id]",
      ];
      for (const sel of selectors) {
        const matches = yield* Effect.tryPromise({
          try: () => firstJobListPage.locator(sel).all(),
          catch: () => new Error(`locator failed: ${sel}`),
        });
        yield* Effect.logInfo(`${sel}: ${matches.length} matches`);
      }

      // button.qr_btn の data-id 値をサンプル表示
      const qrButtons = yield* Effect.tryPromise({
        try: () => firstJobListPage.locator("button.qr_btn[data-id]").all(),
        catch: () => new Error("locator failed: button.qr_btn[data-id]"),
      });
      for (const btn of qrButtons.slice(0, 3)) {
        const dataId = yield* Effect.tryPromise({
          try: () => btn.getAttribute("data-id"),
          catch: () => new Error("getAttribute failed"),
        });
        yield* Effect.logInfo(`  data-id sample: ${dataId}`);
      }
    }),
  );

  const runnable = program.pipe(
    Effect.provide(ChromiumBrowserConfig.dev),
    Effect.provide(DebugDumpConfig.dev),
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  await Effect.runPromise(runnable);
}

main();
