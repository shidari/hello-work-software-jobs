import { createD1DB } from "@sho/db";
import type { Env } from "../functions/index";

export const startCrawlerRun = async (
  env: Env,
  trigger: "cron" | "manual",
): Promise<number> => {
  const db = createD1DB(env.DB);
  const now = new Date().toISOString();
  const result = await db
    .insertInto("crawler_runs")
    .values({
      status: "running",
      trigger,
      startedAt: now,
      createdAt: now,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return result.id;
};

export const finishCrawlerRun = async (
  env: Env,
  id: number,
  result: {
    status: "success" | "failed";
    fetchedCount?: number;
    queuedCount?: number;
    failedCount?: number;
    errorMessage?: string;
  },
): Promise<void> => {
  const db = createD1DB(env.DB);
  await db
    .updateTable("crawler_runs")
    .set({
      status: result.status,
      finishedAt: new Date().toISOString(),
      fetchedCount: result.fetchedCount ?? 0,
      queuedCount: result.queuedCount ?? 0,
      failedCount: result.failedCount ?? 0,
      errorMessage: result.errorMessage ?? null,
    })
    .where("id", "=", id)
    .execute();
};
