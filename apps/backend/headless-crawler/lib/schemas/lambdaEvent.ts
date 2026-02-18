import { Schema } from "effect";

export const eventSchema = Schema.partial(
  Schema.Struct({
    debugLog: Schema.Boolean,
  }),
);
