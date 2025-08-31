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
    expect(json).toHaveProperty("error");
  });
});
