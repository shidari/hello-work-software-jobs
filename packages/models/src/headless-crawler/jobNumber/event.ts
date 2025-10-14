import * as v from "valibot";
import { etCrawlerConfigWithoutBrowserConfigSchema } from "./config";

export const eventSchema = v.object({
  extendedConfig: v.optional(etCrawlerConfigWithoutBrowserConfigSchema),
});
