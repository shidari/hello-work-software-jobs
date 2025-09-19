import { Hono } from "hono";
import jobs from "./jobs";

const app = new Hono();

app.get("/", (c) => c.redirect("/doc"));
app.route("/jobs", jobs);

export default app;
