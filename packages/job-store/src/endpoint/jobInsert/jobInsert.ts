import {
  insertJobClientErrorResponseSchema,
  insertJobServerErrorResponseSchema,
  insertJobSuccessResponseSchema,
} from "@sho/models";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/valibot";

export const jobInsertRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(insertJobSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(insertJobClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(insertJobServerErrorResponseSchema),
        },
      },
    },
  },
});
