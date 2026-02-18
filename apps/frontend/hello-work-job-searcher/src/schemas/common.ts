import { Schema } from "effect";

const ISO_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const ISODateSchema = Schema.String.pipe(
  Schema.pattern(ISO_TIMESTAMP_REGEX),
);
