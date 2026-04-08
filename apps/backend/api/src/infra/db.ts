import { createDB } from "@sho/db";
import { Context } from "effect";
import { D1Dialect } from "kysely-d1";

export class JobStoreDB extends Context.Tag("JobStoreDB")<
  JobStoreDB,
  ReturnType<typeof createDB>
>() {
  static main = (binding: D1Database) =>
    createDB(new D1Dialect({ database: binding }));
}
