import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import {
  buildJobStoreClient,
  fromEventToFirstRecord,
  job2InsertedJob,
} from "./helper";
import { buildScrapingResult } from "../../lib/scraper/scraper";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const effect = Effect.gen(function* () {
    const jobNumber = yield* fromEventToFirstRecord(event);
    const result = yield* buildScrapingResult(jobNumber);
    const result2InsertedJob = yield* job2InsertedJob(result);
    const client = yield* buildJobStoreClient();
    return yield* client.insertJob(result2InsertedJob);
  });
  const result = await Effect.runPromiseExit(effect);

  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
  }
};
