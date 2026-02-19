import { Job } from "@sho/models";
import { Schema } from "effect";

export const jobSelectSchema = Schema.Struct({
  id: Schema.Number,
  ...Job.fields,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
