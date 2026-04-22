/**
 * 詳細検索ページのフロー検証スクリプト。
 *
 * 検証する流れ:
 *   1. かんたん検索ページを開く
 *   2. 「もっと詳しい条件を入力する」ボタンで詳細検索ページへ遷移
 *   3. 「ソフトウェア開発技術者、プログラマー」を選択し検索実行
 *
 * 失敗時: `DUMP_ON_ERROR_DIR` 配下に page の HTML + screenshot を書き出す
 * （browser.ts の release phase で対応）。
 *
 * Usage:
 *   pnpm dev:verify-detail-search
 */

import { Effect, Logger, LogLevel } from "effect";
import { ChromiumBrowserConfig, DebugDumpConfig } from "../browser";
import {
  navigateByCriteria,
  navigateToDetailedJobSearchPage,
} from "../page/detail-search";
import { openJobSearchPage } from "../page/search";

async function main() {
  const program = Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.logInfo("opening simple search page...");
      const simple = yield* openJobSearchPage();

      yield* Effect.logInfo("transitioning to detailed search page...");
      const detailed = yield* navigateToDetailedJobSearchPage(simple);

      yield* Effect.logInfo(
        "filling occupation (ソフトウェア開発技術者、プログラマー) + submitting...",
      );
      const list = yield* navigateByCriteria(detailed, {
        desiredOccupation: {
          occupationSelection: "ソフトウェア開発技術者、プログラマー",
        },
        searchPeriod: "withinTwoDays",
      });

      const url = list.url();
      const count = yield* Effect.tryPromise({
        try: () => list.locator("table.kyujin").count(),
        catch: (e) => new Error(`locator count failed: ${String(e)}`),
      });
      yield* Effect.logInfo(`landed on: ${url}`);
      yield* Effect.logInfo(`found ${count} job rows`);
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
