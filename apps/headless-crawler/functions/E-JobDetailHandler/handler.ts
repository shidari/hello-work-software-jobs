import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { fromEventToFirstRecord } from "../E-T-L-JobDetailHandler/helper";
import { buildProgram } from "../../lib/jobDetailPage/extractor";
import {
  ConfigLive,
  extractorLive,
} from "../../lib/jobDetailPage/extractor/context";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const runnable = Effect.gen(function* () {
    const jobNumber = yield* fromEventToFirstRecord(event);
    // ちょっと、名前がよくない、多分、使い方が間違ってるかも
    const { rawHtml } = yield* buildProgram(jobNumber);
    return rawHtml;
  })
    .pipe(Effect.provide(extractorLive))
    .pipe(Effect.provide(ConfigLive))
    .pipe(Effect.scoped);
  const result = await Effect.runPromiseExit(runnable);
  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
  }
};
