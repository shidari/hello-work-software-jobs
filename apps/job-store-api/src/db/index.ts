// db.ts
import { drizzle } from "drizzle-orm/d1";
import type { Context } from "hono";
import { env } from "hono/adapter";

export const getDb = (c: Context) => {
  const { DB } = env<{ DB: D1Database }>(c);
  return drizzle(DB);
};
