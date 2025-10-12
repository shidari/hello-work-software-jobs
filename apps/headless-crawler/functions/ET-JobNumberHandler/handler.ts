import type { EventBridgeEvent, Handler } from "aws-lambda";
import { Effect, Exit, Config } from "effect";
import { etCrawlerEffect } from "../../lib/E-T-crawler";
import { sendMessageToQueue } from "../helpers/helper";
import { buildExtractorAndTransformerConfigLive, crawlerLive } from "../../lib/E-T-crawler/context";

export const handler: Handler<
  // biome-ignore lint/complexity/noBannedTypes: <explanation>
  EventBridgeEvent<"Scheduled Event", {}>,
  unknown // 型つけるのが面倒くさいので
> = async (_) => {
  const program = Effect.gen(function* () {
    const QUEUE_URL = yield* Config.string("QUEUE_URL");
    const runnable = etCrawlerEffect.pipe(Effect.provide(crawlerLive)).pipe(Effect.scoped).pipe(Effect.provide(buildExtractorAndTransformerConfigLive({ logDebug: false })));
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
