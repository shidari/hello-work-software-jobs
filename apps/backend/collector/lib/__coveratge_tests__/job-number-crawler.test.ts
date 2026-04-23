// Low-quality sweep tests for hellowork/job-number-crawler/crawl.ts —
// exercise the SearchConfig / CrawlerConfig layers.

import { Effect, Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { ChromiumBrowserConfig, DebugDumpConfig } from "../hellowork/browser";
import {
  CrawlerConfig,
  paginatedJobNumbers,
  SearchConfig,
} from "../hellowork/job-number-crawler/crawl";

describe("coverage sweep: SearchConfig layers", () => {
  it("SearchConfig.simple provides a simple tagged config", async () => {
    const cfg = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* SearchConfig;
      }).pipe(Effect.provide(SearchConfig.simple)),
    );
    expect(cfg._tag).toBe("simple");
  });

  it("SearchConfig.detailed provides a detailed tagged config", async () => {
    const cfg = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* SearchConfig;
      }).pipe(Effect.provide(SearchConfig.detailed)),
    );
    expect(cfg._tag).toBe("detailed");
  });
});

describe("coverage sweep: CrawlerConfig layers", () => {
  it("CrawlerConfig.main composes SearchConfig.simple", async () => {
    const cfg = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* CrawlerConfig;
      }).pipe(
        Effect.provide(
          CrawlerConfig.main.pipe(Layer.provide(SearchConfig.simple)),
        ),
      ),
    );
    expect(cfg.untilCount).toBe(2000);
  });

  it("CrawlerConfig.dev composes SearchConfig.detailed", async () => {
    const cfg = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* CrawlerConfig;
      }).pipe(
        Effect.provide(
          CrawlerConfig.dev.pipe(Layer.provide(SearchConfig.detailed)),
        ),
      ),
    );
    expect(cfg.untilCount).toBe(1);
    expect(cfg._tag).toBe("detailed");
  });
});

describe("coverage sweep: paginatedJobNumbers fails without chromium", () => {
  const fakeBrowser = Layer.succeed(ChromiumBrowserConfig, {
    executablePath: "/nonexistent",
    headless: true,
    args: [],
  });

  const crawlerLayers = CrawlerConfig.dev.pipe(
    Layer.provide(SearchConfig.simple),
  );

  it("detailed path exits with failure when chromium is missing", async () => {
    const result = await Effect.runPromise(
      Stream.runCollect(paginatedJobNumbers()).pipe(
        Effect.scoped,
        Effect.provide(crawlerLayers),
        Effect.provide(fakeBrowser),
        Effect.provide(DebugDumpConfig.dev),
        Effect.exit,
      ),
    );
    expect(result._tag).toBe("Failure");
  });

  it("simple path with detailed config also fails early", async () => {
    const detailedCrawler = CrawlerConfig.dev.pipe(
      Layer.provide(SearchConfig.detailed),
    );
    const result = await Effect.runPromise(
      Stream.runCollect(paginatedJobNumbers()).pipe(
        Effect.scoped,
        Effect.provide(detailedCrawler),
        Effect.provide(fakeBrowser),
        Effect.provide(DebugDumpConfig.dev),
        Effect.exit,
      ),
    );
    expect(result._tag).toBe("Failure");
  });
});
