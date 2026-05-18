import { applyD1Migrations, env } from "cloudflare:test";
import { afterEach } from "vitest";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    TEST_MIGRATIONS: D1Migration[];
  }
}

// Setup files run outside isolated storage, and may be run multiple times.
// `applyD1Migrations()` only applies migrations that haven't already been
// applied, therefore it is safe to call this function here.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// @cloudflare/vitest-pool-workers v0.13+ ではストレージ isolation がテスト単位
// からテストファイル単位に縮退した。同一ファイル内のテストは DB を共有するため、
// 各テスト終了時にユーザーテーブルを掃除して相互干渉を防ぐ。
// `d1_migrations` (migration tracker) と `sqlite_*` (system) は残す。
afterEach(async () => {
  const { results } = await env.DB.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '_cf_%'
       AND name != 'd1_migrations'`,
  ).all<{ name: string }>();
  if (results.length === 0) return;
  await env.DB.batch(
    results.map(({ name }) => env.DB.prepare(`DELETE FROM "${name}"`)),
  );
});
