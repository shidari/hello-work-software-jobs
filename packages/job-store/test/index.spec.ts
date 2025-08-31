import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Job Store API - Invalid Request Tests", () => {
  it("GET /api/v1/jobs/continue without nextToken should fail", async () => {
    const res = await app.request("/api/v1/jobs/continue");
    expect(res.status).toBe(400);
  });

  it("GET /api/v1/jobs with invalid query should fail", async () => {
    const res = await app.request("/api/v1/jobs?employeeCountGt=notanumber");
    // バリデーションエラー時は400
    expect([400, 500]).toContain(res.status);
  });

  it("GET /api/v1/jobs with negative employeeCountGt should fail", async () => {
    const res = await app.request("/api/v1/jobs?employeeCountGt=-1");
    expect([400, 500]).toContain(res.status);
  });

  it("GET /api/v1/jobs with invalid orderByReceiveDate should fail", async () => {
    const res = await app.request("/api/v1/jobs?orderByReceiveDate=invalid");
    expect([400, 500]).toContain(res.status);
  });

  it("GET /api/v1/jobs/:jobNumber with invalid param should fail", async () => {
    const res = await app.request("/api/v1/jobs/invalid");
    expect([400, 500]).toContain(res.status);
  });
  it("GET /api/v1/jobs with invalid orderByReceiveDate value should fail", async () => {
    const res = await app.request("/api/v1/jobs?orderByReceiveDate=up");
    expect([400, 500]).toContain(res.status);
  });

  it("GET /api/v1/jobs/:jobNumber with too short format should fail", async () => {
    const res = await app.request("/api/v1/jobs/123-1");
    expect([400, 500]).toContain(res.status);
  });

  it("POST /api/v1/job with invalid body should fail", async () => {
    const res = await app.request("/api/v1/job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/job with missing Content-Type should fail", async () => {
    const res = await app.request("/api/v1/job", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect([400, 415]).toContain(res.status);
  });
});
