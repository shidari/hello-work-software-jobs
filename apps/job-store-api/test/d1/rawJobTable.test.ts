import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { expect, it } from "vitest";
import { rawJobs } from "../../src/db/schema";
import { eq } from "drizzle-orm";
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

it("求人データの生HTMLを挿入できる", async () => {
  const db = drizzle(env.DB);
  db.insert(rawJobs)
    .values({
      jobNumber: "64455-10912",
      rawHTML: "<html>...</html>",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  const inserted = await db
    .select()
    .from(rawJobs)
    .where(eq(rawJobs.jobNumber, "64455-10912"))
    .get();
  expect(inserted?.jobNumber).toBe("64455-10912");
  expect(inserted?.rawHTML).toBe("<html>...</html>");
});
