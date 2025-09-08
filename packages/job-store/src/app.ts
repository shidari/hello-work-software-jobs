import { swaggerUI } from "@hono/swagger-ui";
import { type Context, Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import job from "./endpoint/job";
import jobs from "./endpoint/jobs";
import jobsContinue from "./endpoint/jobs/continue";

const j = Symbol();
type JWTSecret = string & { [j]: unknown };

export type Env = {
  DB: D1Database;
  JWT_SECRET: JWTSecret;
  API_KEY: string;
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
// こっちを先にしないと、/apiv/v1/jobs/:jobNumberに飛んでしまう
app.route("/api/v1/jobs/continue", jobsContinue);
app.route("/api/v1/job", job);
app.route("/api/v1/jobs", jobs);
app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Job Store API",
        version: "1.3",
        description: "Job Store API",
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
            description: "API key required in the 'x-api-key' header.",
          },
        },
      },
    },
  }),
);
app.get("/", swaggerUI({ url: "/openapi" }));
v1Api.get("/", swaggerUI({ url: "/openapi" }));
app.get("/docs", swaggerUI({ url: "/openapi" }));

export { app };
