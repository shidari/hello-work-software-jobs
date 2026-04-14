import { Effect, Schema } from "effect";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { FetchDailyStatsQuery } from "../cqrs/queries";
import { JobStoreDB } from "../infra/db";
import { LoggerLayer, logErrorCause } from "../log";

const dailyStatsSuccessResponseSchema = Schema.Struct({
  stats: Schema.Array(
    Schema.Struct({
      addedDate: Schema.String,
      count: Schema.Number,
      jobNumbers: Schema.Array(Schema.String),
    }),
  ),
});

const dailyStatsRoute = describeRoute({
  responses: {
    "200": {
      description: "日ごとの新着求人数サマリー",
      content: {
        "application/json": {
          schema: resolver(
            Schema.standardSchemaV1(dailyStatsSuccessResponseSchema),
          ),
        },
      },
    },
    "500": {
      description: "internal server error",
      content: {
        "application/json": {
          schema: resolver(
            Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
          ),
        },
      },
    },
  },
});

const app = new Hono<{ Bindings: Env }>().get(
  "/daily",
  dailyStatsRoute,
  (c) => {
    const db = JobStoreDB.main(c.env.DB);

    return Effect.runPromise(
      Effect.gen(function* () {
        const query = yield* FetchDailyStatsQuery;
        return yield* query.run();
      }).pipe(
        Effect.provide(FetchDailyStatsQuery.Default),
        Effect.provideService(JobStoreDB, db),
        Effect.tapErrorCause((cause) =>
          logErrorCause("fetch daily stats failed", cause),
        ),
        Effect.match({
          onSuccess: (stats) => c.json({ stats }),
          onFailure: () => c.json({ message: "internal server error" }, 500),
        }),
        Effect.provide(LoggerLayer),
      ),
    );
  },
);

export default app;
