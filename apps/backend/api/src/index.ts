import { swaggerUI } from "@hono/swagger-ui";
import { Effect } from "effect";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import companies from "./app/companies";
import jobs from "./app/jobs";
import stats from "./app/stats";
import { runLog } from "./log";
import { rateLimit } from "./middleware/rate-limit";
import { securityHeaders } from "./middleware/security-headers";

const app = new Hono()
  .use("*", rateLimit)
  .use("*", securityHeaders)
  .use("*", async (c, next) => {
    const start = Date.now();
    const { method, url } = c.req;

    await runLog(
      Effect.logInfo("request started").pipe(
        Effect.annotateLogs({ method, url }),
      ),
    );

    await next();

    await runLog(
      Effect.logInfo("request completed").pipe(
        Effect.annotateLogs({
          method,
          url,
          status: c.res.status,
          durationMs: Date.now() - start,
        }),
      ),
    );
  })
  .route("/jobs", jobs)
  .route("/companies", companies)
  .route("/stats", stats);
app.get(
  "/openapi",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Job Store API",
        version: "1.5",
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
app.get("/", (c) => c.redirect("/doc"));
app.get("/doc", swaggerUI({ url: "/openapi" }));

export { app };

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
