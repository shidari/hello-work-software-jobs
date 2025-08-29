import {
  jobListContinueClientErrorResponseSchema,
  jobListContinueServerErrorSchema,
  jobListSuccessResponseSchema,
} from "@sho/models";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/valibot";

export const jobListContinueRoute = describeRoute({
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
          schema: resolver(jobListContinueClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(jobListContinueServerErrorSchema),
        },
      },
    },
  },
});
