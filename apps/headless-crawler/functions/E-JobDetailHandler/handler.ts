import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { extractJobDetailRawHtml } from "../../lib/jobDetailExtractor";
import { fromEventToFirstRecord } from "../E-T-L-JobDetailHandler/helper";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const effect = Effect.gen(function* () {
    const jobNumber = yield* fromEventToFirstRecord(event);

    const rawHtml = yield* extractJobDetailRawHtml(jobNumber);
    return rawHtml;
  });
  const result = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
  }
};
