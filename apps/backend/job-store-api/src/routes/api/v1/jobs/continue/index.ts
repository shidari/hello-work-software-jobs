import { Job } from "@sho/models";
import { drizzle } from "drizzle-orm/d1";
import { Either, Schema } from "effect";
import { TreeFormatter } from "effect/ParseResult";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";
import {
  describeRoute,
  validator as effectValidator,
  resolver,
} from "hono-openapi";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import type { FetchJobsPageCommand } from "../../../../../adapters";
import { createJobStoreDBClientAdapter } from "../../../../../adapters";
import { createFetchJobListError } from "../../../../../adapters/error";
import { PAGE_SIZE } from "../../../../../constant";

// --- エラー型 ---

type EnvError = {
  readonly _tag: "EnvError";
  readonly message: string;
};

const createEnvError = (message: string): EnvError => ({
  _tag: "EnvError",
  message,
});

type JWTSignatureError = {
  readonly _tag: "JWTSignatureError";
  readonly message: string;
};

const createJWTSignatureError = (message: string): JWTSignatureError => ({
  _tag: "JWTSignatureError",
  message,
});

type JWTVerificationError = {
  readonly _tag: "JWTVerificationError";
  readonly message: string;
};

const createJWTVerificationError = (message: string): JWTVerificationError => ({
  _tag: "JWTVerificationError",
  message,
});

type DecodeJWTPayloadError = {
  readonly _tag: "DecodeJWTPayloadError";
  readonly message: string;
};

const createDecodeJWTPayloadError = (
  message: string,
): DecodeJWTPayloadError => ({
  _tag: "DecodeJWTPayloadError",
  message,
});

// --- スキーマ ---

const envSchema = Schema.Struct({
  JWT_SECRET: Schema.String,
});

const searchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.Number.pipe(Schema.int())),
  employeeCountGt: Schema.optional(Schema.Number.pipe(Schema.int())),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  onlyNotExpired: Schema.optional(Schema.Boolean),
  orderByReceiveDate: Schema.optional(
    Schema.Union(Schema.Literal("asc"), Schema.Literal("desc")),
  ),
  addedSince: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
  ),
  addedUntil: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
  ),
});

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

// --- ルーティングスキーマ ---

const messageErrorSchema = Schema.Struct({
  message: Schema.String,
});

const jobListSuccessResponseSchema = Schema.Struct({
  jobs: Schema.Array(Job),
  nextToken: Schema.optional(Schema.String),
  meta: Schema.Struct({
    totalCount: Schema.Number,
  }),
});

const jobListContinueRoute = describeRoute({
  parameters: [
    {
      name: "nextToken",
      in: "query",
    },
  ],
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(
            Schema.standardSchemaV1(jobListSuccessResponseSchema),
          ),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
        },
      },
    },
  },
});

// --- ルートハンドラ ---

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/",
  jobListContinueRoute,
  effectValidator("query", Schema.standardSchemaV1(jobListContinueQuerySchema)),
  (c) => {
    const { nextToken } = c.req.valid("query");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db);

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
