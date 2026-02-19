import { Schema } from "effect";
import { describeRoute, resolver } from "hono-openapi";
import { jobListSuccessResponseSchema } from "../routingSchema";

const messageErrorSchema = Schema.Struct({
  message: Schema.String,
});

export const jobListContinueRoute = describeRoute({
  parameters: [
    {
      name: "nextToken",
      in: "query",
    },
  ],
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(
            Schema.standardSchemaV1(jobListSuccessResponseSchema),
          ),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
        },
      },
    },
  },
});
