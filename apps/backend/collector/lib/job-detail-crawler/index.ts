import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import { JobDetailExtractor } from "./extractor";
import { JobDetailLoader } from "./loader";
import { JobDetailTransformer } from "./transformer";

// re-export
export { ExtractJobDetailRawHtmlError, JobDetailExtractor } from "./extractor";
export { InsertJobError, JobDetailLoader, JobStoreClient } from "./loader";
export {
  JobDetailTransformError,
  JobDetailTransformer,
  type TransformedJob,
} from "./transformer";

// ── processJob (Effect.fn — 手続き的オーケストレーション) ──

export const processJob = Effect.fn("processJob")(function* (
  jobNumber: JobNumber,
) {
  const extractor = yield* JobDetailExtractor;
  const transformer = yield* JobDetailTransformer;
  const loader = yield* JobDetailLoader;
  const { rawHtml } = yield* extractor.extractRawHtml(jobNumber);
  const transformed = yield* transformer.transform(rawHtml);
  yield* loader.load(transformed);
  return transformed;
});
