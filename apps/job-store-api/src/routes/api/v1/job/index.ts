import { vValidator } from "@hono/valibot-validator";
import {
  insertJobClientErrorResponseSchema,
  insertJobRequestBodySchema,
  insertJobServerErrorResponseSchema,
  insertJobSuccessResponseSchema,
} from "@sho/models";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { okAsync, safeTry } from "neverthrow";
import { createJobStoreResultBuilder } from "../../../../clientImpl";
import { createJobStoreDBClientAdapter } from "../../../../clientImpl/adapter";

const jobInsertRoute = describeRoute({
  security: [{ ApiKeyAuth: [] }],
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(insertJobSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(insertJobClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(insertJobServerErrorResponseSchema),
        },
      },
    },
  },
});

const app = new Hono<{ Bindings: Env }>();
app.post(
  "/",
  jobInsertRoute,
  // APIキー認証ミドルウェア
  (c, next) => {
    const apiKey = c.req.header("x-api-key");
    const validApiKey = c.env.API_KEY;
    if (!apiKey || apiKey !== validApiKey) {
      return c.json({ message: "Invalid API key" }, 401);
    }
    return next();
  },
  vValidator("json", insertJobRequestBodySchema, (result, c) => {
    if (!result.success) {
      console.log(
        `Invalid request body: ${JSON.stringify(result.issues, null, 2)}`,
      );
      return c.json({ message: "Invalid request body" }, 400);
    }
    return c.json(result.output);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db);
    const jobStore = createJobStoreResultBuilder(dbClient);
    const result = await safeTry(async function* () {
      const job = yield* await jobStore.insertJob(body);
      return okAsync(job);
    });
    return result.match(
      (job) => c.json(job),
      (error) => {
        console.error(error);

        switch (error._tag) {
          case "InsertJobError":
            return c.json({ message: error.message }, 500);
          case "InsertJobDuplicationError":
            return c.json({ message: error.message }, 400);
          default: {
            const _exhaustiveCheck: never = error;
            return c.json({ message: "Unknown error occurred" }, 500);
          }
        }
      },
    );
  },
);

export default app;
