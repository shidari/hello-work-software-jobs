import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { DB } from "./generated/types";

export function createD1DB(database: D1Database): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new D1Dialect({ database }),
  });
}
