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

// ── Crawler サービス (E + T + L オーケストレーション) ──

export class JobDetailCrawler extends Effect.Service<JobDetailCrawler>()(
  "JobDetailCrawler",
  {
    effect: Effect.gen(function* () {
      const extractor = yield* JobDetailExtractor;
      const transformer = yield* JobDetailTransformer;
      const loader = yield* JobDetailLoader;
      return {
        processJob: (jobNumber: JobNumber) =>
          Effect.gen(function* () {
            const { rawHtml } = yield* extractor.extractRawHtml(jobNumber);
            const transformed = yield* transformer.transform(rawHtml);
            yield* loader.load(transformed);
            return transformed;
          }),
      };
    }),
    dependencies: [
      JobDetailExtractor.Default,
      JobDetailTransformer.Default,
      JobDetailLoader.Default,
    ],
  },
) {}
