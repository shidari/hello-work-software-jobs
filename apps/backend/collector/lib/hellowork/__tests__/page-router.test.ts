import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  ChromiumBrowserConfig,
  Mode,
  openBrowserPage,
  type PageSnapshot,
} from "../browser";

describe("Mode.test fixture routing", () => {
  it("page.goto に対して URL マッチした snapshot HTML を配信する", async () => {
    const snapshot: PageSnapshot = {
      url: "https://fixture.test/hello",
      html: "<!doctype html><html><body><h1 id='greeting'>fixture-served</h1></body></html>",
    };

    const program = Effect.gen(function* () {
      const page = yield* openBrowserPage();
      yield* Effect.tryPromise(() => page.goto(snapshot.url));
      return yield* Effect.tryPromise(() =>
        page.locator("#greeting").textContent(),
      );
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.scoped,
        Effect.provide(ChromiumBrowserConfig.dev),
        Effect.provide(Mode.test([snapshot])),
      ),
    );

    expect(result).toBe("fixture-served");
  });

  it("snapshot に無い URL は abort される（実ネットワークに到達しない）", async () => {
    const snapshot: PageSnapshot = {
      url: "https://fixture.test/known",
      html: "<!doctype html><html><body>known</body></html>",
    };

    const program = Effect.gen(function* () {
      const page = yield* openBrowserPage();
      return yield* Effect.tryPromise({
        try: () => page.goto("https://fixture.test/unknown"),
        catch: (e) => e,
      }).pipe(Effect.flip);
    });

    const error = await Effect.runPromise(
      program.pipe(
        Effect.scoped,
        Effect.provide(ChromiumBrowserConfig.dev),
        Effect.provide(Mode.test([snapshot])),
      ),
    );

    expect(String(error)).toMatch(/aborted|net::ERR_FAILED/i);
  });
});
