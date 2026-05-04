import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chunk, Effect, Logger, LogLevel, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { ChromiumBrowserConfig, Mode } from "../browser";
import {
  CrawlerConfig,
  paginatedJobNumbers,
  SearchConfig,
} from "../job-number-crawler/crawl";
import { loadFixtures } from "./fixtures";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "__fixtures__/job-list-pagination");

describe("paginatedJobNumbers fixture pagination", () => {
  it("3 ページの list を巡って全 job number を取得する", async () => {
    const snapshots = await Effect.runPromise(loadFixtures(fixturesDir));

    const program = Stream.runCollect(paginatedJobNumbers());

    const chunks = await Effect.runPromise(
      program.pipe(
        Effect.provide(CrawlerConfig.dev),
        Effect.provide(SearchConfig.simple),
        Effect.provide(ChromiumBrowserConfig.dev),
        Effect.provide(Mode.test(snapshots)),
        Effect.scoped,
        Logger.withMinimumLogLevel(LogLevel.Warning),
      ),
    );

    const allJobNumbers = Chunk.toReadonlyArray(chunks).flatMap((arr) => [
      ...arr,
    ]);

    expect(allJobNumbers).toHaveLength(9);
    expect(allJobNumbers[0]).toBe("99999-99999991");
    expect(allJobNumbers[3]).toBe("99999-99999994");
    expect(allJobNumbers[8]).toBe("99999-99999999");
  }, 30_000);
});
