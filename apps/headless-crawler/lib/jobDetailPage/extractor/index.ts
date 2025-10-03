import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import { HelloWorkRawJobDetailHtmlExtractor } from "./context";
export const buildProgram = (jobNumber: JobNumber) =>
  Effect.gen(function* () {
    const extractor = yield* HelloWorkRawJobDetailHtmlExtractor;
    const rawHtml = yield* extractor.extractRawHtml(jobNumber);
    return rawHtml;
  });
