import { Config, Effect, Either, Exit, Logger, LogLevel, Schema } from "effect";
import { PlaywrightBrowserConfig } from "../../lib/browser";
import { HelloWorkCrawler } from "../../lib/job-number-crawler/crawl";
import { eventSchema } from "../../lib/schemas";
import { formatParseError } from "../../lib/util";
import { sendMessageToQueue } from "../helpers/helper";
import { EventSchemaValidationError } from "./error";

// Handler
export const handler = async (event: unknown) => {
  const program = Effect.gen(function* () {
    const QUEUE_URL = yield* Config.string("QUEUE_URL");
    const eventResult = Schema.decodeUnknownEither(eventSchema)(event);
    if (Either.isLeft(eventResult))
      return yield* Effect.fail(
        new EventSchemaValidationError({
          message: `detail: ${formatParseError(eventResult.left)}`,
        }),
      );
    const { debugLog } = eventResult.right;
    const crawler = yield* HelloWorkCrawler;
    const jobs = yield* crawler
      .crawlJobLinks()
      .pipe(
        Logger.withMinimumLogLevel(debugLog ? LogLevel.Debug : LogLevel.Info),
      );
    yield* Effect.forEach(jobs, (job) =>
      sendMessageToQueue({ jobNumber: job.jobNumber }, QUEUE_URL),
    );
    return jobs;
  }).pipe(
    Effect.provide(HelloWorkCrawler.Default),
    Effect.provide(PlaywrightBrowserConfig.lambda),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    console.log("handler succeeded", JSON.stringify(exit.value, null, 2));
    return exit.value;
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
