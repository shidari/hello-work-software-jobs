import { Schema } from "effect";

export const envSchema = Schema.Struct({
  JWT_SECRET: Schema.String,
});
