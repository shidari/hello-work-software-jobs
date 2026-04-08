import type { RawCompany, RawJob } from "@sho/models/raw";
import { Data, Effect, Schema } from "effect";
import { CompanyToCompanyTable, JobStoreDB, JobToJobTable } from "../infra/db";

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
        run: (payload: RawJob) =>
          Effect.tryPromise({
            try: async () => {
              const dbValues = Schema.decodeSync(JobToJobTable)(payload);
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
        run: (payload: RawCompany) =>
          Effect.tryPromise({
            try: async () => {
              const dbValues = Schema.decodeSync(CompanyToCompanyTable)(
                payload,
              );
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
                    updatedAt: dbValues.updatedAt,
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
