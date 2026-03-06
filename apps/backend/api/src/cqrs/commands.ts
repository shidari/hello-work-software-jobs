import type { Job } from "@sho/models";
import { Data, Effect, Schema } from "effect";
import { DbJobSchema, JobStoreDB } from ".";

// --- エラー ---

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly message: string;
  readonly errorType: "client" | "server";
}> {}

export class InsertJobDuplicationError extends Data.TaggedError(
  "InsertJobDuplicationError",
)<{
  readonly message: string;
  readonly errorType: "client" | "server";
}> {}

// --- コマンド ---

export class InsertJobCommand extends Effect.Service<InsertJobCommand>()(
  "InsertJobCommand",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (payload: Job) =>
          Effect.tryPromise({
            try: async () => {
              const now = new Date().toISOString();
              const dbValues = Schema.encodeSync(DbJobSchema)({
                ...payload,
                status: "active",
                createdAt: now,
                updatedAt: now,
              });
              await db.insertInto("jobs").values(dbValues).execute();
              return { jobNumber: payload.jobNumber };
            },
            catch: (e) =>
              new InsertJobError({
                message: String(e),
                errorType: "server",
              }),
          }),
      };
    }),
  },
) {}
