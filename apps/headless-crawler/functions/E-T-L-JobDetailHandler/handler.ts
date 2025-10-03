import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { fromEventToFirstRecord } from "./helper";
import { buildProgram as buildExtractorProgram } from "../../lib/jobDetailPage/extractor";
import { buildProgram as buildTransformerProgram } from "../../lib/jobDetailPage/transformer/transfomer";
// これ、よくない、命名が
import { buildProgram as runLoaderProgram } from "../../lib/jobDetailPage/loader/loader";
import {
  extractorConfigLive,
  extractorLive,
} from "../../lib/jobDetailPage/extractor/context";
import {
  transformerConfigLive,
  transformerLive,
} from "../../lib/jobDetailPage/transformer/context";
import {
  loaderConfigLive,
  loaderLive,
} from "../../lib/jobDetailPage/loader/context";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const program = Effect.gen(function* () {
    const jobNumber = yield* fromEventToFirstRecord(event);
    const { rawHtml } = yield* buildExtractorProgram(jobNumber);
    const transformed = yield* buildTransformerProgram(rawHtml);
    yield* runLoaderProgram(transformed);
  });
  const runnable = program
    .pipe(Effect.provide(extractorLive))
    .pipe(Effect.provide(extractorConfigLive))
    .pipe(Effect.scoped)
    .pipe(Effect.provide(transformerLive))
    .pipe(Effect.provide(transformerConfigLive))
    .pipe(Effect.provide(loaderLive))
    .pipe(Effect.provide(loaderConfigLive));
  const result = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
  }
};
