import type { InferOutput } from "valibot";
import type { insertJobRequestBodySchema } from "../../schemas";

export type InsertJobRequestBody = InferOutput<
  typeof insertJobRequestBodySchema
>;
