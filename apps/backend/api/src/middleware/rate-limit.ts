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

// 二つの文字列の constant-time 比較。SHA-256 で固定長化してから XOR 累積。
// 入力長や共通プレフィックス長による分岐がないため timing 攻撃が成立しない。
async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", enc.encode(a)),
  );
  const bHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", enc.encode(b)),
  );
  let diff = 0;
  for (let i = 0; i < aHash.length; i++) {
    diff |= aHash[i] ^ bHash[i];
  }
  return diff === 0;
}

/**
 * クライアントごとの bucket id を決める。
 * **有効な** API key 提示者のみ `key:<hash>` bucket を割り当てる。
 * 無効 key / no key は `ip:<CF-Connecting-IP>` に集約され、攻撃者が key 値を
 * 都度ローテして per-IP rate-limit を回避するのを防ぐ。
 */
async function bucketIdFor(c: Context<{ Bindings: Env }>): Promise<string> {
  const apiKey = c.req.header("x-api-key");
  const validApiKey = c.env.API_KEY;
  if (
    apiKey &&
    validApiKey &&
    (await constantTimeEquals(apiKey, validApiKey))
  ) {
    return `key:${await sha256Hex(apiKey)}`;
  }
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  return `ip:${ip}`;
}

/**
 * D1 Token Bucket によるレート制限。
 *
 * 設計上の注意:
 * - `last_refill_ms` は **INTEGER ミリ秒** (Date.now()) で持つ。SQLite の
 *   `datetime('now')` は秒精度・`julianday('now')` はマイクロ秒精度で、両者
 *   混用すると同秒内 R-M-W で refill が消費を必ず上回り、bucket が枯渇
 *   しない致命バグになる。
 * - INSERT + UPDATE を **単一の UPSERT 文** にまとめ、SQLite の per-row
 *   atomic 性質に乗せて R-M-W race を排除する。複数の `.batch + UPDATE`
 *   を発行する旧設計は、並列リクエストが全員 tokens=100 を読んでしまう
 *   race を踏む。
 * - D1 障害時は fail-closed (503)。
 */
export async function rateLimit(c: Context<{ Bindings: Env }>, next: Next) {
  const db = c.env.DB;
  const id = await bucketIdFor(c);
  const now = Date.now();

  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS _rate_limit (
          id TEXT PRIMARY KEY,
          tokens REAL NOT NULL,
          last_refill_ms INTEGER NOT NULL
        )`,
      )
      .run();

    const result = await db
      .prepare(
        `INSERT INTO _rate_limit (id, tokens, last_refill_ms)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           tokens = MIN(?, tokens + (excluded.last_refill_ms - last_refill_ms) / 1000.0 * ?) - 1,
           last_refill_ms = excluded.last_refill_ms
         RETURNING tokens`,
      )
      .bind(id, MAX_TOKENS - 1, now, MAX_TOKENS, REFILL_RATE)
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
