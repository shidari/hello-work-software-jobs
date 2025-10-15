import type { EventBridgeEvent, Handler } from "aws-lambda";
import { Effect, Exit, Config } from "effect";
import { etCrawlerEffect } from "../../lib/E-T-crawler";
import { sendMessageToQueue } from "../helpers/helper";
import { buildMainLive } from "../../lib/E-T-crawler/context";
import { safeParse } from "valibot";
import { eventSchema } from "@sho/models";
import { EventSchemaValidationError } from "./error";
import { issueToLogString } from "../../lib/core/util";

export const handler = async (event: unknown) => {
  const program = Effect.gen(function* () {
    const QUEUE_URL = yield* Config.string("QUEUE_URL");
    const { extendedConfig } = yield* (() => {
      const result = safeParse(eventSchema, event);
      if (!result.success) return Effect.fail(new EventSchemaValidationError({ message: `detail: ${result.issues.map(issueToLogString).join(", ")}` }));
      return Effect.succeed(result.output);
    })()
    const runnable = etCrawlerEffect
      .pipe(Effect.provide(buildMainLive({ logDebug: extendedConfig.debugLog || false })))
      .pipe(Effect.scoped);
    const jobs = yield* runnable;
    yield* Effect.forEach(jobs, (job) =>
      sendMessageToQueue({ jobNumber: job.jobNumber }, QUEUE_URL),
    );
    return jobs;
  });
  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    console.log("handler succeeded", JSON.stringify(exit.value, null, 2));
    return exit.value;
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
