import type { Context, Next } from "hono";

const MAX_TOKENS = 100;
const REFILL_RATE = 10; // tokens per second

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/**
 * クライアントごとの bucket id を決める。
 * 認証済み (x-api-key 提示) は key のハッシュで、それ以外は CF-Connecting-IP で識別する。
 * 単一クライアントの burst が他クライアントを枯渇させない設計。
 */
async function bucketIdFor(c: Context<{ Bindings: Env }>): Promise<string> {
  const apiKey = c.req.header("x-api-key");
  if (apiKey) {
    return `key:${await sha256Hex(apiKey)}`;
  }
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  return `ip:${ip}`;
}

/**
 * D1 Token Bucket によるレート制限。
 * bucket は client identity (API key hash or IP) で分離する。
 * D1 障害時は fail-closed で 503 を返す。
 */
export async function rateLimit(c: Context<{ Bindings: Env }>, next: Next) {
  const db = c.env.DB;
  const id = await bucketIdFor(c);

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
           VALUES (?, ?, datetime('now'))`,
        )
        .bind(id, MAX_TOKENS),
    ]);

    const result = await db
      .prepare(
        `UPDATE _rate_limit
         SET tokens = MIN(?, tokens + (julianday('now') - julianday(last_refill)) * 86400 * ?) - 1,
             last_refill = datetime('now')
         WHERE id = ?
         RETURNING tokens`,
      )
      .bind(MAX_TOKENS, REFILL_RATE, id)
      .first<{ tokens: number }>();

    if (result && result.tokens < 0) {
      return c.json({ message: "Too many requests" }, 429);
    }
  } catch (e) {
    console.error("[rateLimit] error:", e);
    return c.json({ message: "Rate limiter unavailable" }, 503);
  }

  return next();
}
