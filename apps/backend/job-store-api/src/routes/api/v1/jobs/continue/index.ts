import { vValidator } from "@hono/valibot-validator";
import {
  type DecodedNextToken,
  decodedNextTokenSchema,
  type FetchJobsPageCommand,
  jobListContinueQuerySchema,
} from "@sho/models";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import * as v from "valibot";
import { createEnvError, createJWTSignatureError } from "../../../../error";
import { envSchema } from "../../../../util";
import {
  createDecodeJWTPayloadError,
  createJWTVerificationError,
} from "./error";
import { createJobStoreDBClientAdapter } from "../../../../../adapters";
import { createFetchJobListError } from "../../../../../adapters/error";
import { PAGE_SIZE } from "../../../../../common";
import { jobListContinueRoute } from "./routingSchema";

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/",
  jobListContinueRoute,
  vValidator("query", jobListContinueQuerySchema),
  (c) => {
    const { nextToken } = c.req.valid("query");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db); // DrizzleをJobStoreDBClientに変換

    const result = safeTry(async function* () {
      const { JWT_SECRET: jwtSecret } = yield* (() => {
        const result = v.safeParse(envSchema, c.env);
        if (!result.success)
          return err(
            createEnvError(
              `Environment variable validation failed. received: ${JSON.stringify(c.env)}\n${String(result.issues)}`,
            ),
          );
        return ok(result.output);
      })();
      const decodeResult = yield* ResultAsync.fromPromise(
        verify(nextToken, jwtSecret, "HS256"),
        (error) =>
          createJWTVerificationError(
            `JWT verification failed.\n${error instanceof Error ? `error: ${error.name}, message: ${error.message}` : String(error)}`,
          ),
      );

      console.log("Decoded JWT payload:", decodeResult);

      const payloadValidation = v.safeParse(
        decodedNextTokenSchema,
        decodeResult,
      );
      if (!payloadValidation.success) {
        return err(
          createDecodeJWTPayloadError(
            `Decoding JWT payload failed. received: ${JSON.stringify(decodeResult, null, 2)}\n${String(payloadValidation.issues.map((i) => i.message).join("\n"))}`,
          ),
        );
      }
      const validatedPayload = payloadValidation.output;
      const nextPage = validatedPayload.page + 1;
      // ジョブリスト取得
      const fetchJobListCommand: FetchJobsPageCommand = {
        type: "FetchJobsPage",
        options: {
          page: nextPage,
          filter: validatedPayload.filter,
        },
      };
      const jobListResult = yield* ResultAsync.fromSafePromise(
        dbClient.execute(fetchJobListCommand),
      );
      if (!jobListResult.success) {
        return err(createFetchJobListError("Failed to fetch job list"));
      }
      const { jobs, meta } = jobListResult;
      const newNextToken = yield* (() => {
        const offset = (nextPage - 1) * PAGE_SIZE;
        if (jobListResult.meta.totalCount <= offset + PAGE_SIZE)
          return okAsync(undefined);
        const validPayload: DecodedNextToken = {
          exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
          iss: "sho-hello-work-job-searcher",
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
          page: nextPage,
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
          case "JWTVerificationError":
            throw new HTTPException(400, { message: "invalid nextToken" });
          case "JWTSignatureError":
          case "EnvError":
            throw new HTTPException(500, { message: "internal server error" });
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
