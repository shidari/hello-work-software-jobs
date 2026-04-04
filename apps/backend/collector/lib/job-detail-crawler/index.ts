import type { JobNumber } from "@sho/models";
import { Effect } from "effect";
import { JobDetailExtractor } from "./extractor";
import { JobDetailLoader } from "./loader";
import { JobDetailTransformer } from "./transformer";

// re-export
export {
  ExtractJobDetailRawHtmlError,
  JobDetailExtractor,
} from "./extractor";
export { JobDetailLoader, JobStoreClient } from "./loader";
export {
  CompanyTransformError,
  JobDetailTransformError,
  JobDetailTransformer,
  type TransformedCompany,
  type TransformedJob,
} from "./transformer";

// ── processJob (Effect.fn — 手続き的オーケストレーション) ──

export const processJob = Effect.fn("processJob")(function* (
  jobNumber: JobNumber,
) {
  const extractor = yield* JobDetailExtractor;
  const transformer = yield* JobDetailTransformer;
  const loader = yield* JobDetailLoader;

  // 1. Extract raw HTML
  const { rawHtml } = yield* extractor.extractRawHtml(jobNumber);

  // 2. Transform HTML → domain models
  const { job, company } = yield* transformer.transform(rawHtml);

  // 3. Load company (UPSERT) if extracted
  if (company) {
    yield* loader.loadCompany(company);
  }

  // 4. Load job
  yield* loader.load(job);

  return { job, company };
});
