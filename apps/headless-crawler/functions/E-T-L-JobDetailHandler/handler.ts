import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { fromEventToFirstRecord } from "./helper";
import { buildProgram as buildExtractorProgram } from "../../lib/jobDetail/extractor";
import { buildProgram as buildTransformerProgram } from "../../lib/jobDetail/transformer/transfomer";
// これ、よくない、命名が
import { buildProgram as runLoaderProgram } from "../../lib/jobDetail/loader/loader";
import {
  extractorLive,
} from "../../lib/jobDetail/extractor/context";
import {
  transformerConfigLive,
  transformerLive,
} from "../../lib/jobDetail/transformer/context";
import {
  loaderConfigLive,
  loaderLive,
} from "../../lib/jobDetail/loader/context";
import { ExtractorConfig } from "../../lib/service/jobDetail/config";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const program = Effect.gen(function* () {
    const jobNumber = yield* fromEventToFirstRecord(event);
    const { rawHtml } = yield* buildExtractorProgram(jobNumber);
    const transformed = yield* buildTransformerProgram(rawHtml);
    yield* runLoaderProgram(transformed);
  });
  const runnable = program
    .pipe(Effect.provide(extractorLive))
    .pipe(Effect.scoped)
    .pipe(Effect.provide(transformerLive))
    .pipe(Effect.provide(transformerConfigLive))
    .pipe(Effect.provide(loaderLive))
    .pipe(Effect.provide(loaderConfigLive))
    .pipe(Effect.provide(ExtractorConfig.Default))
  const result = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
    throw new Error(JSON.stringify(result.cause, null, 2));
  }
};
