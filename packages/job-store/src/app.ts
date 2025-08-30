import { swaggerUI } from "@hono/swagger-ui";
import {
  type DecodedNextToken,
  decodedNextTokenSchema,
  insertJobRequestBodySchema,
  jobFetchParamSchema,
  jobListContinueQuerySchema,
  jobListQuerySchema,
} from "@sho/models";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { decode, sign } from "hono/jwt";
import { openAPISpecs } from "hono-openapi";
import { validator as vValidator } from "hono-openapi/valibot";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import * as v from "valibot";
import { createJobStoreResultBuilder } from "./clientImpl";
import { createJobStoreDBClientAdapter } from "./clientImpl/adapter";
import { getDb } from "./db";
import { createEnvError, createJWTSignatureError } from "./endpoint/error";
import { jobFetchRoute } from "./endpoint/jobFetch";
import { jobInsertRoute } from "./endpoint/jobInsert/jobInsert";
import { jobListRoute } from "./endpoint/jobList";
import { jobListContinueRoute } from "./endpoint/jobList/continue";
import {
  createDecodeJWTPayloadError,
  createJWTDecodeError,
  createJWTExpiredError,
} from "./endpoint/jobList/continue/error";

const j = Symbol();
type JWTSecret = string & { [j]: unknown };

const INITIAL_JOB_ID = 1; // 初期のcursorとして使用するjobId

const envSchema = v.object({
  JWT_SECRET: v.string(), // JWTSecret の zod schemaがあればそれを使う
});

export type Env = {
  DB: D1Database;
  JWT_SECRET: JWTSecret;
};
export type AppContext = Context<{ Bindings: Env }>;

const app = new Hono();
const v1Api = new Hono(); // シンプルなログミドルウェア
app.use("*", async (c, next) => {
  const start = Date.now();

  console.log(`📥 ${c.req.method} ${c.req.url}`);

  await next();

  const duration = Date.now() - start;
  console.log(`📤 ${c.res.status} (${duration}ms)`);
});

v1Api.get(
  "/jobs",
  jobListRoute,
  vValidator("query", jobListQuerySchema),
  (c) => {
    const {
      companyName: encodedCompanyName,
      employeeCountGt,
      employeeCountLt,
      jobDescription: encodedJobDescription,
      jobDescriptionExclude: encodedJobDescriptionExclude,
      onlyNotExpired,
      orderByReceiveDate,
    } = c.req.valid("query");
    const companyName = encodedCompanyName
      ? decodeURIComponent(encodedCompanyName)
      : undefined;
    const jobDescription = encodedJobDescription
      ? decodeURIComponent(encodedJobDescription)
      : undefined;

    const jobDescriptionExclude = encodedJobDescriptionExclude
      ? decodeURIComponent(encodedJobDescriptionExclude)
      : undefined;

    const db = getDb(c);
    const dbClient = createJobStoreDBClientAdapter(db);
    const jobStore = createJobStoreResultBuilder(dbClient);

    const limit = 20;

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
      const jobListResult = yield* await jobStore.fetchJobList({
        cursor: { jobId: INITIAL_JOB_ID },
        limit,
        filter: {
          companyName,
          employeeCountGt,
          employeeCountLt,
          jobDescription,
          jobDescriptionExclude,
          onlyNotExpired,
          orderByReceiveDate,
        },
      });

      const {
        jobs,
        cursor: { jobId },
        meta,
      } = jobListResult;

      const { count: restJobCount } = yield* await jobStore.countJobs({
        cursor: { jobId },
        filter: meta.filter,
      });

      const nextToken = yield* (() => {
        if (restJobCount <= limit) return okAsync(undefined);
        const validPayload: DecodedNextToken = {
          exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
          cursor: { jobId },
          filter: meta.filter,
        };
        const signResult = ResultAsync.fromPromise(
          sign(validPayload, jwtSecret),
          (error) =>
            createJWTSignatureError(`JWT signing failed.\n${String(error)}`),
        );
        return signResult;
      })();

      return okAsync({ jobs, nextToken, meta });
    });
    return result.match(
      ({ jobs, nextToken, meta }) => c.json({ jobs, nextToken, meta }),
      (error) => {
        console.error(error);
        switch (error._tag) {
          case "JWTSignatureError":
          case "EnvError":
            throw new HTTPException(500, { message: error.message });
          default:
            throw new HTTPException(500, { message: "internal server error" });
        }
      },
    );
  },
);

v1Api.get(
  "/jobs/continue",
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
            `Decoding JWT payload failed.\n${String(payloadValidation.issues)}`,
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
        cursor: { jobId: validatedPayload.cursor.jobId },
        limit,
        filter: validatedPayload.filter,
      });

      const {
        jobs,
        cursor: { jobId },
        meta,
      } = jobListResult;

      const { count: restJobCount } = yield* await jobStore.countJobs({
        cursor: { jobId },
        filter: meta.filter,
      });

      const newNextToken = yield* (() => {
        if (restJobCount <= limit) return okAsync(undefined);
        const validPayload: DecodedNextToken = {
          exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
          cursor: { jobId },
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
            throw new HTTPException(500, { message: error.message });
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

v1Api.get(
  "/jobs/:jobNumber",
  jobFetchRoute,
  vValidator("param", jobFetchParamSchema),
  (c) => {
    const { jobNumber } = c.req.valid("param");
    const db = getDb(c);
    const dbClient = createJobStoreDBClientAdapter(db);
    const jobStore = createJobStoreResultBuilder(dbClient);

    const result = safeTry(async function* () {
      const job = yield* await jobStore.fetchJob(jobNumber);
      return okAsync(job);
    });
    return result.match(
      (job) => c.json(job),
      (error) => {
        console.error(error);

        switch (error._tag) {
          case "FetchJobError":
            throw new HTTPException(404, { message: "Job not found" });
          default:
            throw new HTTPException(500, { message: "internal server error" });
        }
      },
    );
  },
);
v1Api.post(
  "/job",
  jobInsertRoute,
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
app.route("/api/v1", v1Api);
app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Job Store API",
        version: "1.3",
        description: "Job Store API",
      },
    },
  }),
);
app.get("/", swaggerUI({ url: "/openapi" }));
v1Api.get("/", swaggerUI({ url: "/openapi" }));
app.get("/docs", swaggerUI({ url: "/openapi" }));

export { app };
