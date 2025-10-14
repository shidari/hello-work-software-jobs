import { Effect, Exit, Config } from "effect";
import { etCrawlerEffect } from "../../lib/E-T-crawler";
import { sendMessageToQueue } from "../helpers/helper";
import {
  buildExtractorAndTransformerConfigLive,
  crawlerLive,
  mergeETCrawlerConfig,
} from "../../lib/E-T-crawler/context";
import { safeParse } from "valibot";
import { eventSchema } from "@sho/models";
import { EventSchemaValidationError } from "./error";
import { issueToLogString } from "../../lib/core/util";

export const handler = async (event: unknown) => {
  const program = Effect.gen(function* () {
    const result = safeParse(eventSchema, event);
    if (!result.success) {
      return yield* Effect.fail(new EventSchemaValidationError({ message: `Event schema validation error, detail: ${result.issues.map(issueToLogString).join(", ")}` }));
    }
    const extendedConfig = result.output.extendedConfig;
    const config = yield* mergeETCrawlerConfig(extendedConfig)
    const configLayer = buildExtractorAndTransformerConfigLive(config)
    const QUEUE_URL = yield* Config.string("QUEUE_URL");

    const runnable = etCrawlerEffect
      .pipe(Effect.provide(crawlerLive))
      .pipe(Effect.scoped)
      .pipe(
        Effect.provide(
          configLayer,
        ),
      );
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
