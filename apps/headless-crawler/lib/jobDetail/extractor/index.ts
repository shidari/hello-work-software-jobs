import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import { HelloWorkRawJobDetailHtmlExtractor } from "./context";
export const buildProgram = (jobNumber: JobNumber) =>
  Effect.gen(function* () {
    const extractor = yield* HelloWorkRawJobDetailHtmlExtractor;
    yield* Effect.logInfo(
      `start extracting job detail. jobNumber=${jobNumber}`,
    );
    const rawHtml = yield* extractor.extractRawHtml(jobNumber);
    return rawHtml;
  });
