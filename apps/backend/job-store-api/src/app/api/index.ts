import { Hono } from "hono";
import jobs from "./jobs";

const app = new Hono().get("/", (c) => c.redirect("/doc")).route("/jobs", jobs);

export default app;
