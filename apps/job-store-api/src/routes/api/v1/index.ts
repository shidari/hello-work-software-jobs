import { Hono } from "hono";
import job from "./job";
import jobs from "./jobs";

const app = new Hono();

app.get("/", (c) => c.redirect("/doc"));
app.route("/job", job);
app.route("/jobs", jobs);

export default app;
