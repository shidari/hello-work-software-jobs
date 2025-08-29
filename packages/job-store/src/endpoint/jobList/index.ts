import {
  jobListClientErrorResponseSchema,
  jobListServerErrorSchema,
  jobListSuccessResponseSchema,
} from "@sho/models";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/valibot";

export const jobListRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(jobListSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(jobListClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(jobListServerErrorSchema),
        },
      },
    },
  },
});
