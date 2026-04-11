import { Company } from "@sho/models";
import { Data, Effect, Schema } from "effect";
import { Hono } from "hono";
import { UpsertCompanyCommand } from "../cqrs/commands";
import { FetchJobError, FindCompanyQuery } from "../cqrs/queries";
import { JobStoreDB } from "../infra/db";
import { verifyApiKey } from "../middleware/api-key";

class InvalidJsonError extends Data.TaggedError("InvalidJsonError")<{
  readonly message: string;
}> {}

const app = new Hono<{ Bindings: Env }>()
  .get("/:establishmentNumber", (c) => {
    const establishmentNumber = c.req.param("establishmentNumber");
    const db = JobStoreDB.main(c.env.DB);

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
  .post("/", verifyApiKey)
  .post("/", (c) => {
    const db = JobStoreDB.main(c.env.DB);

    return Effect.runPromise(
      Effect.gen(function* () {
        const body = yield* Effect.tryPromise({
          try: () => c.req.json(),
          catch: () => new InvalidJsonError({ message: "Invalid JSON body" }),
        });
        const company = yield* Schema.decodeUnknown(Company)(body);
        const cmd = yield* UpsertCompanyCommand;
        return yield* cmd.run(company);
      }).pipe(
        Effect.provide(UpsertCompanyCommand.Default),
        Effect.provideService(JobStoreDB, db),
        Effect.match({
          onSuccess: (result) => c.json(result),
          onFailure: (error) => {
            switch (error._tag) {
              case "ParseError":
              case "InvalidJsonError":
                return c.json({ message: error.message }, 400);
              default:
                console.error(error);
                return c.json({ message: "internal server error" }, 500);
            }
          },
        }),
      ),
    );
  });

export default app;
