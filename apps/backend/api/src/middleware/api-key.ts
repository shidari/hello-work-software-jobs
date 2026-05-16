import type { Context, Next } from "hono";

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

/** x-api-key ヘッダーを検証するミドルウェア（constant-time 比較） */
export async function verifyApiKey(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header("x-api-key");
  const validApiKey = c.env.API_KEY;
  if (!apiKey || !validApiKey) {
    return c.json({ message: "Invalid API key" }, 401);
  }
  const ok = await constantTimeEquals(apiKey, validApiKey);
  if (!ok) {
    return c.json({ message: "Invalid API key" }, 401);
  }
  return next();
}
