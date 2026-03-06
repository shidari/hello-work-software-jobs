import { Schema } from "effect";

export const fromExtractJobNumberHandlerJobQueueEventBodySchema = Schema.Struct(
  {
    jobNumber: Schema.String,
  },
);
