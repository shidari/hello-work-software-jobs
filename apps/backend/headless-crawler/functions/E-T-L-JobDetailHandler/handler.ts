import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { PlaywrightBrowserConfig } from "../../lib/browser";
import { JobDetailCrawler } from "../../lib/job-detail-crawler/crawl";
import { fromEventToFirstRecord } from "./helper";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const program = Effect.gen(function* () {
    const crawler = yield* JobDetailCrawler;
    const jobNumber = yield* fromEventToFirstRecord(event);
    yield* crawler.processJob(jobNumber);
  }).pipe(
    Effect.provide(JobDetailCrawler.Default),
    Effect.provide(PlaywrightBrowserConfig.lambda),
    Effect.scoped,
  );
  const result = await Effect.runPromiseExit(program);

  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
    throw new Error(JSON.stringify(result.cause, null, 2));
  }
};
