import { eventSchema } from "../../lib/schemas";
import { Config, Effect, Exit, Logger, LogLevel } from "effect";
import { safeParse } from "valibot";
import { HelloWorkCrawler } from "../../lib/job-number-crawler/crawl";
import { issueToLogString } from "../../lib/util";
import { sendMessageToQueue } from "../helpers/helper";
import { EventSchemaValidationError } from "./error";

// Handler
export const handler = async (event: unknown) => {
  const program = Effect.gen(function* () {
    const QUEUE_URL = yield* Config.string("QUEUE_URL");
    const { debugLog } = yield* (() => {
      const result = safeParse(eventSchema, event);
      if (!result.success)
        return Effect.fail(
          new EventSchemaValidationError({
            message: `detail: ${result.issues.map(issueToLogString).join(", ")}`,
          }),
        );
      return Effect.succeed(result.output);
    })();
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
  }).pipe(Effect.provide(HelloWorkCrawler.Default), Effect.scoped);
  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    console.log("handler succeeded", JSON.stringify(exit.value, null, 2));
    return exit.value;
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
