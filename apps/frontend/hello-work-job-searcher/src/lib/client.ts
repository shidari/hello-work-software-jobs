import type { AppType as BackendAppType } from "@sho/api/types";
import { hc } from "hono/client";

export const client = hc<BackendAppType>("/api");
export type Client = typeof client;
