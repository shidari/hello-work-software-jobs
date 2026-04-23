// Low-quality sweep tests for hellowork/page/search + detail-search —
// exercise navigateByCriteria, navigateToDetailedJobSearchPage.

import { Effect, Either } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  navigateByCriteria as detailedNavigate,
  navigateToDetailedJobSearchPage,
} from "../hellowork/page/detail-search";
import { navigateByCriteria as simpleNavigate } from "../hellowork/page/search";

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
  page.waitForURL = vi.fn().mockResolvedValue(undefined);
  page.content = vi.fn().mockResolvedValue("<html></html>");
  page.url = vi.fn().mockReturnValue("https://example");
  page.getByRole = vi.fn().mockReturnValue(locator());
  page.getByText = vi.fn().mockReturnValue(locator());
  return page;
};

describe("coverage sweep: page/search.navigateByCriteria (simple)", () => {
  it("runs with occupation selection", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      simpleNavigate(page, {
        desiredOccupation: {
          occupationSelection: "ソフトウェア開発技術者、プログラマー",
        },
      }).pipe(Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
  });

  it("runs with empty criteria", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      simpleNavigate(page, {}).pipe(Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
  });
});

describe("coverage sweep: page/detail-search navigate", () => {
  it("navigateToDetailedJobSearchPage runs", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      navigateToDetailedJobSearchPage(page).pipe(Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
  });

  it("navigateByCriteria with occupation + withinTwoDays", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      detailedNavigate(page, {
        desiredOccupation: {
          occupationSelection: "ソフトウェア開発技術者、プログラマー",
        },
        searchPeriod: "withinTwoDays",
      }).pipe(Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
  });

  it("navigateByCriteria with withinWeek picks the other selector branch", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      detailedNavigate(page, { searchPeriod: "withinWeek" }).pipe(
        Effect.either,
      ),
    );
    expect(Either.isRight(result)).toBe(true);
  });

  it("navigateByCriteria with empty criteria just clicks search", async () => {
    const page = fakePage();
    const result = await Effect.runPromise(
      detailedNavigate(page, {}).pipe(Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
  });

  it("navigateToDetailedJobSearchPage surfaces PageActionError on click rejection", async () => {
    const page: Record<string, unknown> = {
      getByRole: vi.fn().mockReturnValue({
        click: vi.fn().mockRejectedValue(new Error("bad")),
      }),
      waitForURL: vi.fn().mockResolvedValue(undefined),
    };
    const result = await Effect.runPromise(
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      navigateToDetailedJobSearchPage(page as any).pipe(Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
  });

  it("detailed navigateByCriteria surfaces PageActionError when clickSearchBtn fails", async () => {
    const badLocator = {
      click: vi.fn().mockRejectedValue(new Error("bad")),
      first: () => ({ click: vi.fn().mockRejectedValue(new Error("bad")) }),
    };
    const page: Record<string, unknown> = {
      locator: vi.fn().mockReturnValue(badLocator),
      waitForURL: vi.fn().mockResolvedValue(undefined),
      getByRole: vi.fn().mockReturnValue(badLocator),
      getByText: vi.fn().mockReturnValue(badLocator),
    };
    const result = await Effect.runPromise(
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      detailedNavigate(page as any, {}).pipe(Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
  });
});
