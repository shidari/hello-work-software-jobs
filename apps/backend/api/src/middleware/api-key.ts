import type { Context, Next } from "hono";

/** x-api-key ヘッダーを検証するミドルウェア */
export function verifyApiKey(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header("x-api-key");
  const validApiKey = c.env.API_KEY;
  if (!apiKey || apiKey !== validApiKey) {
    return c.json({ message: "Invalid API key" }, 401);
  }
  return next();
}
