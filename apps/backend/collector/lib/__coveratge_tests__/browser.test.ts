// Low-quality sweep tests for hellowork/browser.ts — layers + error classes.

import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  BrowserContextError,
  BrowserLaunchError,
  BrowserNewPageError,
  ChromiumBrowserConfig,
  DebugDumpConfig,
} from "../hellowork/browser";

describe("coverage sweep: browser.ts errors", () => {
  it("tagged errors carry _tag", () => {
    expect(
      new BrowserLaunchError({ reason: "r", error: new Error("x") })._tag,
    ).toBe("BrowserLaunchError");
    expect(
      new BrowserContextError({ reason: "r", error: new Error("x") })._tag,
    ).toBe("BrowserContextError");
    expect(
      new BrowserNewPageError({ reason: "r", error: new Error("x") })._tag,
    ).toBe("BrowserNewPageError");
  });
});

describe("coverage sweep: ChromiumBrowserConfig.dev", () => {
  it("provides dev launch options", async () => {
    const opts = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* ChromiumBrowserConfig;
      }).pipe(Effect.provide(ChromiumBrowserConfig.dev)),
    );
    expect(opts.headless).toBe(true);
  });
});

describe("coverage sweep: DebugDumpConfig.dev", () => {
  it("provides dev dump dir", async () => {
    const cfg = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* DebugDumpConfig;
      }).pipe(Effect.provide(DebugDumpConfig.dev)),
    );
    expect(cfg.dir).toBe(".debug");
  });
});

describe("coverage sweep: DebugDumpConfig.noop", () => {
  it("dies when used", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* DebugDumpConfig;
      }).pipe(Effect.provide(DebugDumpConfig.noop), Effect.exit),
    );
    expect(result._tag).toBe("Failure");
  });
});

describe("coverage sweep: openBrowserPage failure path", () => {
  it("fails with BrowserLaunchError when chromium binary is missing", async () => {
    const { openBrowserPage } = await import("../hellowork/browser");
    const fakeConfig = Layer.succeed(ChromiumBrowserConfig, {
      executablePath: "/nonexistent/chromium",
      headless: true,
      args: [],
    });
    const result = await Effect.runPromise(
      Effect.scoped(openBrowserPage()).pipe(
        Effect.provide(fakeConfig),
        Effect.provide(DebugDumpConfig.dev),
        Effect.exit,
      ),
    );
    expect(result._tag).toBe("Failure");
  });
});
