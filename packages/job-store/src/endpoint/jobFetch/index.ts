import {
  jobFetchClientErrorResponseSchema,
  jobFetchServerErrorSchema,
  jobFetchSuccessResponseSchema,
} from "@sho/models";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/valibot";

export const jobFetchRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(jobFetchSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(jobFetchClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(jobFetchServerErrorSchema),
        },
      },
    },
  },
});
