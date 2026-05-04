/**
 * fixture HTML を実 chromium で file:// 経由で開き、PNG screenshot を `.debug/fixtures/<scenario>/` に吐く。
 * 各シナリオディレクトリ配下の `*.html` に対して同名の `*.png` を生成。
 * `__shared__/` 等の `__` prefix dir はスキップ。PNG は dev 用の確認資料なので commit しない。
 *
 * Usage:
 *   pnpm tsx lib/hellowork/scripts/render-fixtures.ts
 */

import { mkdir, readdir, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "../../..");
const FIXTURES_ROOT = resolve(__dirname, "../__tests__/__fixtures__");
const OUTPUT_ROOT = resolve(PACKAGE_ROOT, ".debug/fixtures");

async function listScenarioDirs(root: string) {
  const entries = await readdir(root);
  const dirs: string[] = [];
  for (const name of entries) {
    if (name.startsWith("__")) continue;
    const full = resolve(root, name);
    const s = await stat(full);
    if (s.isDirectory()) dirs.push(full);
  }
  return dirs;
}

async function listHtmlFiles(dir: string) {
  const entries = await readdir(dir);
  return entries.filter((e) => e.endsWith(".html")).map((e) => resolve(dir, e));
}

async function main() {
  const scenarios = await listScenarioDirs(FIXTURES_ROOT);
  if (scenarios.length === 0) {
    console.log(`no scenario directories under ${FIXTURES_ROOT}`);
    return;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  try {
    for (const scenarioDir of scenarios) {
      const scenarioName = basename(scenarioDir);
      const outDir = resolve(OUTPUT_ROOT, scenarioName);
      await mkdir(outDir, { recursive: true });
      const htmls = await listHtmlFiles(scenarioDir);
      for (const htmlPath of htmls) {
        await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
        await page.waitForLoadState("networkidle").catch(() => {});
        const pngPath = resolve(
          outDir,
          basename(htmlPath).replace(/\.html$/, ".png"),
        );
        await page.screenshot({ path: pngPath, fullPage: true });
        console.log(`rendered ${pngPath}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
