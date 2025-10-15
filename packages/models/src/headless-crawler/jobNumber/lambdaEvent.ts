import * as v from "valibot";

export const eventSchema = v.partial(v.object({
  debugLog: v.boolean(),
}));
