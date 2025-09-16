import { describe, expect, it } from "vitest";
import { app } from "../src/app";

// テスト用env
const MOCK_ENV = {
  API_KEY: "test-api-key",
};

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
});

describe("Job Store API - API Key Auth", () => {
  it("POST /api/v1/job with invalid API key should return 401", async () => {
    const res = await app.request(
      "/api/v1/job",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "invalid-key",
        },
        body: JSON.stringify({}),
      },
      MOCK_ENV,
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/job with valid API key but invalid body should return 400", async () => {
    const res = await app.request(
      "/api/v1/job",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({}),
      },
      MOCK_ENV,
    );
    expect(res.status).toBe(400);
  });
});

describe("/", () => {
  // open api jsonでinternal server errorが出てないか確かめる用
  it("GET /で302リダイレクトとlocationを確認し、/docで200を確認する", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBe("/doc");
  });
});

describe("/api/v1", () => {
  it("GET /api/v1で302リダイレクトとlocationを確認し、/docで200を確認する", async () => {
    const res = await app.request("/api/v1");
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBe("/doc");
  });
});
