import * as v from "valibot"
import { extendedConfigSchema } from "./extendedConfig"

export const eventSchema = v.object({
    extendedConfig: v.optional(extendedConfigSchema)
})
