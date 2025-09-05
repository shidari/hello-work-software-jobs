import {
  insertJobClientErrorResponseSchema,
  insertJobRequestBodySchema,
  insertJobServerErrorResponseSchema,
  insertJobSuccessResponseSchema,
} from "@sho/models";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describeRoute } from "hono-openapi";
import { resolver, validator as vValidator } from "hono-openapi/valibot";
import { okAsync, safeTry } from "neverthrow";
import type { AppContext } from "../../app";
import { createJobStoreResultBuilder } from "../../clientImpl";
import { createJobStoreDBClientAdapter } from "../../clientImpl/adapter";
import { getDb } from "../../db";

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

const app = new Hono();

app.post(
  "/",
  jobInsertRoute,
  // APIキー認証ミドルウェア
  (c: AppContext, next) => {
    const apiKey = c.req.header("x-api-key");
    const validApiKey = c.env.API_KEY;
    if (!apiKey || apiKey !== validApiKey) {
      throw new HTTPException(401, { message: "Invalid API key" });
    }
    return next();
  },
  vValidator("json", insertJobRequestBodySchema),
  (c) => {
    const body = c.req.valid("json");
    const db = getDb(c);
    const dbClient = createJobStoreDBClientAdapter(db);
    const jobStore = createJobStoreResultBuilder(dbClient);
    const result = safeTry(async function* () {
      const job = yield* await jobStore.insertJob(body);
      return okAsync(job);
    });
    return result.match(
      (job) => c.json(job),
      (error) => {
        console.error(error);

        switch (error._tag) {
          case "InsertJobError":
            throw new HTTPException(500, { message: error.message });
          case "InsertJobDuplicationError":
            throw new HTTPException(400, { message: error.message });
          default:
            throw new HTTPException(500, { message: "Unknown error occurred" });
        }
      },
    );
  },
);

export default app;
