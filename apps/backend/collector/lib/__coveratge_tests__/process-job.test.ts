// Low-quality sweep tests for job-detail-crawler/index.processJob — uses
// fully-stubbed extractor/transformer/loader layers.

import type { JobNumber } from "@sho/models";
import { Effect, Layer } from "effect";
import { describe, it } from "vitest";

import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../hellowork/job-detail-crawler";

const fakeExtractor = Layer.succeed(JobDetailExtractor, {
  extractRawHtml: () =>
    Effect.succeed({
      rawHtml: "<html></html>",
      fetchedDate: "2025-01-01",
      jobNumber: "13080-55925651" as JobNumber,
    }),
  // biome-ignore lint/suspicious/noExplicitAny: test stub
} as any);

const fakeTransformer = Layer.succeed(JobDetailTransformer, {
  transform: () =>
    Effect.succeed({
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      job: { jobNumber: "13080-55925651" } as any,
      company: null,
    }),
  // biome-ignore lint/suspicious/noExplicitAny: test stub
} as any);

describe("coverage sweep: processJob", () => {
  it("extracts → transforms → loads (company = null branch)", async () => {
    await Effect.runPromise(
      processJob("13080-55925651" as JobNumber).pipe(
        Effect.provide(fakeExtractor),
        Effect.provide(fakeTransformer),
        Effect.provide(JobDetailLoader.noop),
      ),
    );
  });

  it("with company present exercises loadCompany branch", async () => {
    const withCompany = Layer.succeed(JobDetailTransformer, {
      transform: () =>
        Effect.succeed({
          // biome-ignore lint/suspicious/noExplicitAny: test stub shape
          job: { jobNumber: "13080-55925651" } as any,
          // biome-ignore lint/suspicious/noExplicitAny: test stub shape
          company: { establishmentNumber: "0101-626495-7" } as any,
        }),
      // biome-ignore lint/suspicious/noExplicitAny: test stub
    } as any);
    await Effect.runPromise(
      processJob("13080-55925651" as JobNumber).pipe(
        Effect.provide(fakeExtractor),
        Effect.provide(withCompany),
        Effect.provide(JobDetailLoader.noop),
      ),
    );
  });
});
