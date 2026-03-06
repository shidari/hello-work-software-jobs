import type { BrowserWorker } from "../lib/browser";
import { handleQueue } from "./E-T-L-JobDetailHandler/handler";
import { handleScheduled } from "./ET-JobNumberHandler/handler";

export type Env = {
  MYBROWSER: BrowserWorker;
  JOB_DETAIL_QUEUE: Queue<{ jobNumber: string }>;
  JOB_STORE_ENDPOINT: string;
  API_KEY: string;
};

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },

  async queue(
    batch: MessageBatch<{ jobNumber: string }>,
    env: Env,
  ): Promise<void> {
    for (const message of batch.messages) {
      await handleQueue(message.body.jobNumber, env);
      message.ack();
    }
  },
};
