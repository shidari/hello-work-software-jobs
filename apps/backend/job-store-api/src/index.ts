import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import jobs from "./app/jobs";

const app = new Hono()
  .use("*", async (c, next) => {
    const start = Date.now();

    console.log(`📥 ${c.req.method} ${c.req.url}`);

    await next();

    const duration = Date.now() - start;
    console.log(`📤 ${c.res.status} (${duration}ms)`);
  })
  .route("/jobs", jobs);
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
