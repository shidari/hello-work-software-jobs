import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { fromEventToFirstRecord } from "./helper";
import { Extractor } from "../../lib/jobDetail/extractor";
import { Transformer } from "../../lib/jobDetail/transformer";
import { Loader } from "../../lib/jobDetail/loader";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const program = Effect.gen(function* () {
    const extractor = yield* Extractor;
    const transformer = yield* Transformer;
    const loader = yield* Loader;
    const jobNumber = yield* fromEventToFirstRecord(event);
    const { rawHtml } = yield* extractor.extractRawHtml(jobNumber);
    const transformed = yield* transformer.transform(rawHtml);
    yield* loader.load(transformed);
  });
  const runnable = program.pipe(
    Effect.provide(Extractor.Default),
    Effect.scoped,
    Effect.provide(Transformer.Default),
    Effect.provide(Loader.Default),
  );
  const result = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
    throw new Error(JSON.stringify(result.cause, null, 2));
  }
};
