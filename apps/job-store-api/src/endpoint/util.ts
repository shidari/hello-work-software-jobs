import * as v from "valibot";

export const envSchema = v.object({
  JWT_SECRET: v.string(), // JWTSecret の zod schemaがあればそれを使う
});
