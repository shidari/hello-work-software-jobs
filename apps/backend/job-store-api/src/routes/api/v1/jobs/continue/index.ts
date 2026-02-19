import { drizzle } from "drizzle-orm/d1";
import { Either, Schema } from "effect";
import { TreeFormatter } from "effect/ParseResult";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";
import { validator as effectValidator } from "hono-openapi";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import type { FetchJobsPageCommand } from "../../../../../adapters";
import { createJobStoreDBClientAdapter } from "../../../../../adapters";
import { createFetchJobListError } from "../../../../../adapters/error";
import { PAGE_SIZE } from "../../../../../common";
import { createEnvError, createJWTSignatureError } from "../../../../error";
import { envSchema } from "../../../../util";
import { searchFilterSchema } from "../searchFilter";
import {
  createDecodeJWTPayloadError,
  createJWTVerificationError,
} from "./error";
import { jobListContinueRoute } from "./routingSchema";

const jobListContinueQuerySchema = Schema.Struct({
  nextToken: Schema.String,
});

const decodedNextTokenSchema = Schema.Struct({
  iss: Schema.String,
  iat: Schema.Number,
  nbf: Schema.Number,
  exp: Schema.Number,
  page: Schema.Number,
  filter: searchFilterSchema,
});

export type DecodedNextToken = typeof decodedNextTokenSchema.Type;

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/",
  jobListContinueRoute,
  effectValidator("query", Schema.standardSchemaV1(jobListContinueQuerySchema)),
  (c) => {
    const { nextToken } = c.req.valid("query");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db); // DrizzleをJobStoreDBClientに変換

    const result = safeTry(async function* () {
      const { JWT_SECRET: jwtSecret } = yield* (() => {
        const result = Schema.decodeUnknownEither(envSchema)(c.env);
        if (Either.isLeft(result))
          return err(
            createEnvError(
              `Environment variable validation failed. received: ${JSON.stringify(c.env)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        return ok(result.right);
      })();
      const decodeResult = yield* ResultAsync.fromPromise(
        verify(nextToken, jwtSecret, "HS256"),
        (error) =>
          createJWTVerificationError(
            `JWT verification failed.\n${error instanceof Error ? `error: ${error.name}, message: ${error.message}` : String(error)}`,
          ),
      );

      console.log("Decoded JWT payload:", decodeResult);

      const payloadValidation = Schema.decodeUnknownEither(
        decodedNextTokenSchema,
      )(decodeResult);
      if (Either.isLeft(payloadValidation)) {
        return err(
          createDecodeJWTPayloadError(
            `Decoding JWT payload failed. received: ${JSON.stringify(decodeResult, null, 2)}\n${TreeFormatter.formatErrorSync(payloadValidation.left)}`,
          ),
        );
      }
      const validatedPayload = payloadValidation.right;
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
