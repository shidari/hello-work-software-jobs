import { Hono } from "hono";
import { handleQueue } from "../../functions/job-detail-handler/handler";

export const pubsubApp = new Hono().post("/pubsub/job-detail", async (c) => {
  const body = await c.req.json();
  const data = JSON.parse(
    Buffer.from(body.message.data, "base64").toString("utf-8"),
  );
  const { jobNumber } = data;
  await handleQueue(jobNumber);
  return c.json({ status: "ok" });
});
