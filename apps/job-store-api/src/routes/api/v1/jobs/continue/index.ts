import { vValidator } from "@hono/valibot-validator";
import {
  type DecodedNextToken,
  decodedNextTokenSchema,
  jobListContinueClientErrorResponseSchema,
  jobListContinueQuerySchema,
  jobListContinueServerErrorSchema,
  jobListSuccessResponseSchema,
} from "@sho/models";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { decode, sign } from "hono/jwt";
import { describeRoute, resolver } from "hono-openapi";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import * as v from "valibot";
import { createJobStoreResultBuilder } from "../../../../../clientImpl";
import { createJobStoreDBClientAdapter } from "../../../../../clientImpl/adapter";
import { getDb } from "../../../../../db";
import { createEnvError, createJWTSignatureError } from "../../../../error";
import { envSchema } from "../../../../util";
import {
  createDecodeJWTPayloadError,
  createJWTDecodeError,
  createJWTExpiredError,
} from "./error";

export const jobListContinueRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(jobListSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(jobListContinueClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(jobListContinueServerErrorSchema),
        },
      },
    },
  },
});

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/",
  jobListContinueRoute,
  vValidator("query", jobListContinueQuerySchema),
  (c) => {
    const { nextToken } = c.req.valid("query");
    const db = getDb(c);
    const dbClient = createJobStoreDBClientAdapter(db); // DrizzleをJobStoreDBClientに変換
    const jobStore = createJobStoreResultBuilder(dbClient);

    const result = safeTry(async function* () {
      const { JWT_SECRET: jwtSecret } = yield* (() => {
        const result = v.safeParse(envSchema, c.env);
        if (!result.success)
          return err(
            createEnvError(
              `Environment variable validation failed: ${String(result.issues)}`,
            ),
          );
        return ok(result.output);
      })();
      const decodeResult = yield* ResultAsync.fromPromise(
        Promise.resolve(decode(nextToken)),
        (error) =>
          createJWTDecodeError(`JWT decoding failed.\n${String(error)}`),
      );

      const payloadValidation = v.safeParse(
        decodedNextTokenSchema,
        decodeResult.payload,
      );
      if (!payloadValidation.success) {
        return err(
          createDecodeJWTPayloadError(
            `Decoding JWT payload failed.\n${String(payloadValidation.issues.map((i) => i.message).join("\n"))}`,
          ),
        );
      }
      const validatedPayload = payloadValidation.output;

      // JWT有効期限チェック
      const now = Math.floor(Date.now() / 1000);
      if (validatedPayload.exp && validatedPayload.exp < now) {
        return err(createJWTExpiredError("JWT expired"));
      }
      const limit = 20;
      // ジョブリスト取得
      const jobListResult = yield* await jobStore.fetchJobList({
        cursor: {
          jobId: validatedPayload.cursor.jobId,
          receivedDateByISOString:
            validatedPayload.cursor.receivedDateByISOString,
        },
        limit,
        filter: validatedPayload.filter,
      });

      const {
        jobs,
        cursor: { jobId, receivedDateByISOString },
        meta,
      } = jobListResult;

      const { count: restJobCount } = yield* await jobStore.countJobs({
        cursor: { jobId, receivedDateByISOString },
        filter: meta.filter,
      });

      const newNextToken = yield* (() => {
        if (restJobCount <= limit) return okAsync(undefined);
        const validPayload: DecodedNextToken = {
          exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
          cursor: { jobId, receivedDateByISOString },
          filter: meta.filter,
        };
        const signResult = ResultAsync.fromPromise(
          sign(validPayload, jwtSecret),
          (error) =>
            createJWTSignatureError(`JWT signing failed.\n${String(error)}`),
        );
        return signResult;
      })();

      return okAsync({ jobs, nextToken: newNextToken, meta });
    });
    return result.match(
      ({ jobs, nextToken, meta }) => c.json({ jobs, nextToken, meta }),
      (error) => {
        console.error(error);

        switch (error._tag) {
          case "JWTDecodeError":
            throw new HTTPException(400, { message: "invalid nextToken" });
          case "JWTSignatureError":
          case "EnvError":
            throw new HTTPException(500, { message: "internal server error" });
          case "JWTExpiredError":
            throw new HTTPException(401, { message: "nextToken expired" });
          case "DecodeJWTPayloadError":
            throw new HTTPException(400, { message: "invalid nextToken" });
          default:
            throw new HTTPException(500, { message: "internal server error" });
        }
      },
    );
  },
);

export default app;
