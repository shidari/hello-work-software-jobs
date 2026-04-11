import type { Context, Next } from "hono";

const MAX_TOKENS = 100;
const REFILL_RATE = 10; // tokens per second

/**
 * D1 Token Bucket によるグローバルレート制限。
 * `_rate_limit` テーブルに1行だけ持ち、トークンを管理する。
 */
export async function rateLimit(c: Context<{ Bindings: Env }>, next: Next) {
  const db = c.env.DB;

  try {
    await db.batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS _rate_limit (
          id TEXT PRIMARY KEY,
          tokens REAL NOT NULL,
          last_refill TEXT NOT NULL
        )`,
      ),
      db
        .prepare(
          `INSERT OR IGNORE INTO _rate_limit (id, tokens, last_refill)
         VALUES ('global', ?, datetime('now'))`,
        )
        .bind(MAX_TOKENS),
    ]);

    const result = await db
      .prepare(
        `UPDATE _rate_limit
         SET tokens = MIN(?, tokens + (julianday('now') - julianday(last_refill)) * 86400 * ?) - 1,
             last_refill = datetime('now')
         WHERE id = 'global'
         RETURNING tokens`,
      )
      .bind(MAX_TOKENS, REFILL_RATE)
      .first<{ tokens: number }>();

    if (result && result.tokens < 0) {
      return c.json({ message: "Too many requests" }, 429);
    }
  } catch (e) {
    console.error("[rateLimit] error:", e);
  }

  return next();
}
