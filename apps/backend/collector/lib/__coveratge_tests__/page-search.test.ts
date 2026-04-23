// Low-quality sweep tests for hellowork/page/search — fake Playwright Page.

import { Effect, Either } from "effect";
import { describe, expect, it, vi } from "vitest";

import { navigateByJobNumber } from "../hellowork/page/search";

// Fake Playwright Locator that no-ops on all common operations used in
// page/search.ts / extractor.ts.
const locator = () => {
  const loc: Record<string, unknown> = {};
  loc.click = vi.fn().mockResolvedValue(undefined);
  loc.fill = vi.fn().mockResolvedValue(undefined);
  loc.check = vi.fn().mockResolvedValue(undefined);
  loc.first = () => loc;
  loc.textContent = vi.fn().mockResolvedValue("");
  loc.evaluate = vi.fn().mockResolvedValue(undefined);
  loc.all = vi.fn().mockResolvedValue([]);
  loc.locator = vi.fn().mockReturnValue(loc);
  return loc;
};

// biome-ignore lint/suspicious/noExplicitAny: test stub
const fakePage = (): any => {
  const page: Record<string, unknown> = {};
  page.locator = vi.fn().mockReturnValue(locator());
  page.goto = vi.fn().mockResolvedValue(undefined);
  page.click = vi.fn().mockResolvedValue(undefined);
  page.waitForURL = vi.fn().mockResolvedValue(undefined);
  page.content = vi.fn().mockResolvedValue("<html></html>");
  page.url = vi.fn().mockReturnValue("https://example");
  page.getByRole = vi.fn().mockReturnValue(locator());
  page.getByText = vi.fn().mockReturnValue(locator());
  return page;
};

describe("coverage sweep: navigateByJobNumber", () => {
  it("rejects malformed job numbers with InvalidJobNumberFormatError", async () => {
    const result = await Effect.runPromise(
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      navigateByJobNumber(fakePage() as any, "nohyphen").pipe(Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("InvalidJobNumberFormatError");
    }
  });

  it("proceeds when a properly formatted jobNumber is provided", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      navigateByJobNumber(page as any, "13080-55925651").pipe(Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
    expect(page.locator).toHaveBeenCalled();
  });

  it("surfaces PageActionError when locator.fill rejects", async () => {
    const badLocator = () => {
      const loc: Record<string, unknown> = {};
      loc.fill = vi.fn().mockRejectedValue(new Error("fill boom"));
      loc.first = () => loc;
      loc.click = vi.fn().mockResolvedValue(undefined);
      loc.locator = vi.fn().mockReturnValue(loc);
      return loc;
    };
    const page: Record<string, unknown> = {
      locator: vi.fn().mockReturnValue(badLocator()),
      waitForURL: vi.fn().mockResolvedValue(undefined),
    };
    const result = await Effect.runPromise(
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      navigateByJobNumber(page as any, "13080-55925651").pipe(Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("PageActionError");
    }
  });
});
