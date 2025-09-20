import { expect, test } from "@playwright/test";

// /api/proxy/job-store/jobs GET: クエリ異常系
test.describe("/api/proxy/job-store/jobs", () => {
  test("should return 500 for invalid employeeCountGt (not a number)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/proxy/job-store/jobs?employeeCountGt=abc",
    );
    expect(res.status()).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ "message": "internal server error", "success": false });
  });

  test("should return 500 for invalid employeeCountLt (not a number)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/proxy/job-store/jobs?employeeCountLt=xyz",
    );
    expect(res.status()).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ "message": "internal server error", "success": false });
  });

  test("should return 500 for negative employeeCountGt", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/proxy/job-store/jobs?employeeCountGt=-1",
    );
    expect(res.status()).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ "message": "internal server error", "success": false });
  });

  test("should return 500 for negative employeeCountLt", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/proxy/job-store/jobs?employeeCountLt=-1",
    );
    expect(res.status()).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ "message": "internal server error", "success": false });
  });
});

// /api/proxy/job-store/jobs/continue GET: nextToken異常系
test.describe("/api/proxy/job-store/jobs/continue", () => {
  test("should return 400 if nextToken is missing", async ({ request }) => {
    const res = await request.get("/api/proxy/job-store/jobs/continue");
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ "message": "Missing nextToken", "success": false });
  });

  test("should return 500 if nextToken is invalid", async ({ request }) => {
    const res = await request.get(
      "/api/proxy/job-store/jobs/continue?nextToken=invalidtoken",
    );
    expect([400, 500]).toContain(res.status());
    const json = await res.json();
    expect(json).toEqual({ "message": "internal server error", "success": false });
  });
});
