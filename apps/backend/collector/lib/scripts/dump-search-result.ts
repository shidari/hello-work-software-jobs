/**
 * 検索結果ページのHTMLをダンプし、セレクタの一致状況を表示する診断ツール。
 *
 * Usage:
 *   pnpm verify:dump-html [searchPeriod]
 *
 * searchPeriod: "today" (default) | "week" | "all"
 */

import * as fs from "node:fs";
import { Effect, Layer, Logger, LogLevel } from "effect";
import { PlaywrightBrowserConfig } from "../browser";
import type { SearchPeriod } from "../job-number-crawler/crawl";
import {
  decodeCrawlerConfig,
  JobNumberCrawlerConfig,
} from "../job-number-crawler/crawl";
import { navigateByCriteria, openJobSearchPage } from "../page";

const searchPeriod = (process.argv[2] ?? "today") as SearchPeriod;
const outPath = "/tmp/hellowork-search-result.html";

async function main() {
  const crawlerConfigLayer = Layer.succeed(
    JobNumberCrawlerConfig,
    decodeCrawlerConfig({
      roughMaxCount: 50,
      jobSearchCriteria: { searchPeriod },
    }),
  );

  const program = Effect.gen(function* () {
    const cfg = yield* JobNumberCrawlerConfig;
    yield* Effect.logInfo(`searchPeriod=${cfg.jobSearchCriteria.searchPeriod}`);
    const jobSearchPage = yield* openJobSearchPage();
    const firstJobListPage = yield* navigateByCriteria(
      jobSearchPage,
      cfg.jobSearchCriteria,
    );
    const html = yield* Effect.tryPromise({
      try: () => firstJobListPage.content(),
      catch: (e) => new Error(`Failed to get content: ${String(e)}`),
    });
    fs.writeFileSync(outPath, html);
    yield* Effect.logInfo(`HTML dumped to ${outPath} (${html.length} bytes)`);

    const selectors = ["table.kyujin.mt1.noborder", "table.kyujin", "table"];
    for (const sel of selectors) {
      const matches = yield* Effect.tryPromise({
        try: () => firstJobListPage.locator(sel).all(),
        catch: () => new Error(`locator failed: ${sel}`),
      });
      yield* Effect.logInfo(`${sel}: ${matches.length} matches`);
    }
  });

  const runnable = program.pipe(
    Effect.provide(crawlerConfigLayer),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  await Effect.runPromise(runnable);
}

main();
