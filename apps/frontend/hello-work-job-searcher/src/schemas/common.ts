import * as v from "valibot";

export const ISODateSchema = v.pipe(v.string(), v.isoTimestamp());
