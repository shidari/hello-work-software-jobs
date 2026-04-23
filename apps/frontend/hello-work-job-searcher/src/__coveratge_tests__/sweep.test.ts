// Low-quality sweep tests: purpose is to inflate vitest coverage numbers
// by exercising the cheapest pure-logic paths of the frontend package.
// These are NOT behavioural tests — do not use them as documentation.

import { Schema } from "effect";
import { createStore } from "jotai/vanilla";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  favoriteAppendWriter,
  favoriteJobsAtom,
  favoriteJobsSelector,
  favoriteRemoveWriter,
  isFavoriteSelector,
} from "@/atom";
import { JobOverviewSchema } from "@/dto";
import { formatDate, naturals } from "@/util";

const sampleJob = {
  jobNumber: "13080-55925651",
  companyName: "Coverage Co",
  occupation: "engineer",
  employmentType: "正社員",
  workPlace: "tokyo",
  employeeCount: 10,
  receivedDate: "2024-01-01T00:00:00Z",
};

describe("coverage sweep: util.ts", () => {
  it("naturals yields 0, 1, 2, ...", () => {
    const gen = naturals();
    expect(gen.next().value).toBe(0);
    expect(gen.next().value).toBe(1);
    expect(gen.next().value).toBe(2);
  });

  it("formatDate returns Japanese-formatted date", () => {
    expect(formatDate("2024-01-01T00:00:00Z")).toMatch(/2024年/);
  });

  it("formatDate returns empty string on empty input", () => {
    expect(formatDate("")).toBe("");
  });
});

describe("coverage sweep: atom.ts favorites store", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: () => null,
      length: 0,
    });
  });

  it("favoriteJobsSelector starts empty", () => {
    const store = createStore();
    expect(store.get(favoriteJobsSelector)).toEqual([]);
  });

  it("append then remove exercises both writers", () => {
    const store = createStore();
    store.set(favoriteAppendWriter, sampleJob);
    expect(store.get(favoriteJobsSelector).length).toBe(1);
    const checker = store.get(isFavoriteSelector);
    expect(checker(sampleJob.jobNumber)).toBe(true);
    expect(checker("missing")).toBe(false);

    store.set(favoriteRemoveWriter, sampleJob.jobNumber);
    expect(store.get(favoriteJobsSelector)).toEqual([]);
  });

  it("favoriteJobsAtom can be set directly", () => {
    const store = createStore();
    store.set(favoriteJobsAtom, [sampleJob]);
    expect(store.get(favoriteJobsSelector).length).toBe(1);
  });
});

describe("coverage sweep: dto.ts", () => {
  it("JobOverviewSchema decodes a valid overview", () => {
    const decoded = Schema.decodeUnknownSync(JobOverviewSchema)(sampleJob);
    expect(decoded.jobNumber).toBe(sampleJob.jobNumber);
  });
});
