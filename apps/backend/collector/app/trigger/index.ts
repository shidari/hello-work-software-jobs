import { Effect, Layer } from "effect";
import { Hono } from "hono";
import { handleScheduled } from "../../functions/ET-JobNumberHandler/handler";
import type { Env } from "../../functions/index";
import { AuthMiddleware } from "../middleware/auth";

export class TriggerApp extends Effect.Service<TriggerApp>()("TriggerApp", {
  effect: Effect.gen(function* () {
    const auth = yield* AuthMiddleware;

    const app = new Hono<{ Bindings: Env }>().post(
      "/trigger",
      auth.middleware,
      (c) => {
        c.executionCtx?.waitUntil(handleScheduled(c.env));
        return c.json({ message: "Crawler triggered" }, 202);
      },
    );

    return app;
  }),
  dependencies: [AuthMiddleware.Default],
}) {
  static test = TriggerApp.Default.pipe(Layer.provide(AuthMiddleware.test));
}
