import { ConfigProvider, Effect, Layer } from "effect";
import { TriggerApp } from "../app/trigger";
import type { BrowserWorker } from "../lib/browser";
import { handleQueue } from "./E-T-L-JobDetailHandler/handler";
import { handleScheduled } from "./ET-JobNumberHandler/handler";

export type Env = {
  MYBROWSER: BrowserWorker;
  JOB_DETAIL_QUEUE: Queue<{ jobNumber: string }>;
  JOB_STORE_ENDPOINT: string;
  API_KEY: string;
  DB: D1Database;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const program = Effect.gen(function* () {
      const app = yield* TriggerApp;
      return app;
    }).pipe(
      Effect.provide(TriggerApp.Default),
      Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    );

    const triggerApp = await Effect.runPromise(program);
    return triggerApp.fetch(request, env, ctx);
  },

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(env, "cron"));
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
