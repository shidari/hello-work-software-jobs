import { createD1DB } from "@sho/db";
import { Company } from "@sho/models";
import { Effect, Schema } from "effect";
import { Hono } from "hono";
import { JobStoreDB } from "../cqrs";
import { UpsertCompanyCommand } from "../cqrs/commands";
import { FetchJobError, FindCompanyQuery } from "../cqrs/queries";

const app = new Hono<{ Bindings: Env }>()
  .get("/:establishmentNumber", (c) => {
    const establishmentNumber = c.req.param("establishmentNumber");
    const db = createD1DB(c.env.DB);

    return Effect.runPromise(
      Effect.gen(function* () {
        const query = yield* FindCompanyQuery;
        const company = yield* query.run(establishmentNumber);
        if (company === null) {
          return yield* new FetchJobError({
            message: "Company not found",
            errorType: "client",
          });
        }
        return company;
      }).pipe(
        Effect.provide(FindCompanyQuery.Default),
        Effect.provideService(JobStoreDB, db),
        Effect.match({
          onSuccess: (company) => c.json(company),
          onFailure: (error) => {
            console.error(error);
            switch (error._tag) {
              case "FetchJobError":
                return c.json({ message: "Company not found" }, 404);
              default:
                return c.json({ message: "internal server error" }, 500);
            }
          },
        }),
      ),
    );
  })
  .post("/", (c, next) => {
    const apiKey = c.req.header("x-api-key");
    const validApiKey = c.env.API_KEY;
    if (!apiKey || apiKey !== validApiKey) {
      return c.json({ message: "Invalid API key" }, 401);
    }
    return next();
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const db = createD1DB(c.env.DB);

    return Effect.runPromise(
      Effect.gen(function* () {
        const company = yield* Schema.decodeUnknown(Company)(body);
        const cmd = yield* UpsertCompanyCommand;
        return yield* cmd.run(company);
      }).pipe(
        Effect.provide(UpsertCompanyCommand.Default),
        Effect.provideService(JobStoreDB, db),
        Effect.match({
          onSuccess: (result) => c.json(result),
          onFailure: (error) => {
            console.error(error);
            return c.json({ message: "internal server error" }, 500);
          },
        }),
      ),
    );
  });

export default app;
