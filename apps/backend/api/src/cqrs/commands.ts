import type { Company, Job } from "@sho/models";
import { Data, Effect, Schema } from "effect";
import { JobStoreDB } from "../infra/db";
import { DbCompanySchema, DbJobSchema } from ".";

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

export class UpsertCompanyError extends Data.TaggedError("UpsertCompanyError")<{
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

export class UpsertCompanyCommand extends Effect.Service<UpsertCompanyCommand>()(
  "UpsertCompanyCommand",
  {
    effect: Effect.gen(function* () {
      const db = yield* JobStoreDB;
      return {
        run: (payload: Company) =>
          Effect.tryPromise({
            try: async () => {
              const now = new Date().toISOString();
              const dbValues = Schema.encodeSync(DbCompanySchema)({
                ...payload,
                createdAt: now,
                updatedAt: now,
              });
              await db
                .insertInto("companies")
                .values(dbValues)
                .onConflict((oc) =>
                  oc.column("establishmentNumber").doUpdateSet({
                    companyName: dbValues.companyName,
                    postalCode: dbValues.postalCode,
                    address: dbValues.address,
                    employeeCount: dbValues.employeeCount,
                    foundedYear: dbValues.foundedYear,
                    capital: dbValues.capital,
                    businessDescription: dbValues.businessDescription,
                    corporateNumber: dbValues.corporateNumber,
                    updatedAt: now,
                  }),
                )
                .execute();
              return {
                establishmentNumber: payload.establishmentNumber,
              };
            },
            catch: (e) =>
              new UpsertCompanyError({
                message: String(e),
                errorType: "server",
              }),
          }),
      };
    }),
  },
) {}
