import { Schema } from "effect";
export const jobQueueEventBodySchema = Schema.parseJson(
  Schema.Struct({
    job: Schema.Struct({
      jobNumber: Schema.String,
    }),
  }),
);
