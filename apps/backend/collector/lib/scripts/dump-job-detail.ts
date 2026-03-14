/**
 * 求人詳細ページのHTMLをダンプするスクリプト。
 * セレクターID調査用。
 *
 * Usage:
 *   pnpm tsx lib/scripts/dump-job-detail.ts [jobNumber]
 */

import * as fs from "node:fs";
import type { JobNumber } from "@sho/models";
import { Effect, Logger, LogLevel } from "effect";
import { PlaywrightBrowserConfig, PlaywrightChromium } from "../browser";
import { navigateByJobNumber, openJobSearchPage } from "../page";

const jobNumber = (process.argv[2] ?? "01010-10336561") as JobNumber;
const outPath = `/tmp/hellowork-job-detail-${jobNumber}.html`;

async function main() {
  const program = Effect.gen(function* () {
    yield* Effect.logInfo(`dumping job detail HTML for ${jobNumber}...`);
    const jobSearchPage = yield* openJobSearchPage();
    const firstJobListPage = yield* navigateByJobNumber(
      jobSearchPage,
      jobNumber,
    );

    // Click detail button
    const showDetailBtn = firstJobListPage.locator("#ID_dispDetailBtn").first();
    yield* Effect.tryPromise({
      try: async () => {
        showDetailBtn.evaluate((elm: Element) => elm.removeAttribute("target"));
        await showDetailBtn.click();
      },
      catch: (e) => new Error(`Failed to navigate to detail page: ${e}`),
    });

    // Wait for detail page
    yield* Effect.tryPromise({
      try: () => firstJobListPage.waitForSelector("div.page_title"),
      catch: (e) => new Error(`Failed to wait for detail page: ${e}`),
    });

    const html = yield* Effect.tryPromise({
      try: () => firstJobListPage.content(),
      catch: (e) => new Error(`Failed to get content: ${e}`),
    });

    fs.writeFileSync(outPath, html);
    yield* Effect.logInfo(`HTML dumped to ${outPath} (${html.length} bytes)`);
  });

  const runnable = program.pipe(
    Effect.provide(PlaywrightChromium.Default),
    Effect.provide(PlaywrightBrowserConfig.dev),
    Effect.scoped,
    Logger.withMinimumLogLevel(LogLevel.Debug),
  );
  await Effect.runPromise(runnable);
}

main();
