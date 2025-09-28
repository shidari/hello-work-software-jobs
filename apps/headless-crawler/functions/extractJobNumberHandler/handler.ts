import type { EventBridgeEvent, Handler } from "aws-lambda";
import { Effect, Exit, pipe } from "effect";
import { crawlerRunnable } from "../../lib/crawler";
import { sendJobToQueue } from "../helpers/helper";

export const handler: Handler<
  // biome-ignore lint/complexity/noBannedTypes: <explanation>
  EventBridgeEvent<"Scheduled Event", {}>,
  unknown // 型つけるのが面倒くさいので
> = async (_) => {
  const program = pipe(
    crawlerRunnable,
    Effect.tap((jobs) => Effect.forEach(jobs, sendJobToQueue)),
  );

  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    console.log("handler succeeded", JSON.stringify(exit.value, null, 2));
    return exit.value;
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
