import { Effect, Layer } from "effect";
import { Hono } from "hono";
import { handleScheduled } from "../../functions/job-number-handler/handler";
import type { SearchPeriod } from "../../lib/job-number-crawler/crawl";
import { AuthMiddleware } from "../middleware/auth";

const validPeriods = new Set<string>(["today", "week", "all"]);

export class TriggerApp extends Effect.Service<TriggerApp>()("TriggerApp", {
  effect: Effect.gen(function* () {
    const auth = yield* AuthMiddleware;

    const app = new Hono().post("/trigger", auth.middleware, (c) => {
      const period = c.req.query("period");
      const searchPeriod =
        period && validPeriods.has(period) ? (period as SearchPeriod) : "today";
      const MAX_COUNT_LIMIT = 1000;
      const maxCountRaw = c.req.query("maxCount");
      const maxCount =
        maxCountRaw && /^\d+$/.test(maxCountRaw) && Number(maxCountRaw) > 0
          ? Math.min(Number(maxCountRaw), MAX_COUNT_LIMIT)
          : MAX_COUNT_LIMIT;
      // fire-and-forget: 202 を即返しバックグラウンドで実行。結果は Cloud Logging で確認
      handleScheduled("manual", searchPeriod, maxCount).catch(console.error);
      return c.json({ message: "Crawler triggered" }, 202);
    });

    return app;
  }),
  dependencies: [AuthMiddleware.Default],
}) {
  static test = TriggerApp.DefaultWithoutDependencies.pipe(
    Layer.provide(AuthMiddleware.test),
  );
}
