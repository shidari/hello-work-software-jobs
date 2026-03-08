import { createD1DB, selectCrawlerRuns } from "@sho/db";
import { Effect, Layer } from "effect";
import { Hono } from "hono";
import { handleScheduled } from "../../functions/ET-JobNumberHandler/handler";
import type { Env } from "../../functions/index";
import type { SearchPeriod } from "../../lib/job-number-crawler/type";
import { AuthMiddleware } from "../middleware/auth";

const validPeriods = new Set<string>(["today", "week", "all"]);

export class TriggerApp extends Effect.Service<TriggerApp>()("TriggerApp", {
  effect: Effect.gen(function* () {
    const auth = yield* AuthMiddleware;

    const app = new Hono<{ Bindings: Env }>()
      .post("/trigger", auth.middleware, (c) => {
        const period = c.req.query("period");
        const searchPeriod =
          period && validPeriods.has(period)
            ? (period as SearchPeriod)
            : "today";
        c.executionCtx?.waitUntil(
          handleScheduled(c.env, "manual", searchPeriod),
        );
        return c.json({ message: "Crawler triggered" }, 202);
      })
      .get("/crawler-runs", auth.middleware, async (c) => {
        const limit = Number(c.req.query("limit") ?? "20");
        const db = createD1DB(c.env.DB);
        const runs = await selectCrawlerRuns(db, limit);
        return c.json(runs);
      });

    return app;
  }),
  dependencies: [AuthMiddleware.Default],
}) {
  static test = TriggerApp.Default.pipe(Layer.provide(AuthMiddleware.test));
}
