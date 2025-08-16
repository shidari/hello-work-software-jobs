import type { NextRequest } from "next/server";
import { jobStoreClientOnServer } from "@/app/store/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyName = searchParams.get("companyName") ?? undefined;
  const employeeCountGtRaw = searchParams.get("employeeCountGt");
  const employeeCountLtRaw = searchParams.get("employeeCountLt");

  // 数値変換（nullや空文字はundefinedに）
  const employeeCountGt =
    employeeCountGtRaw !== null && employeeCountGtRaw !== ""
      ? Number(employeeCountGtRaw)
      : undefined;
  const employeeCountLt =
    employeeCountLtRaw !== null && employeeCountLtRaw !== ""
      ? Number(employeeCountLtRaw)
      : undefined;

  // フィルターオブジェクトを組み立て
  const filter: Record<string, unknown> = {};
  if (companyName) filter.companyName = companyName;
  if (typeof employeeCountGt === "number" && !Number.isNaN(employeeCountGt))
    filter.employeeCountGt = employeeCountGt;
  if (typeof employeeCountLt === "number" && !Number.isNaN(employeeCountLt))
    filter.employeeCountLt = employeeCountLt;

  const result = await jobStoreClientOnServer.getInitialJobs(filter);

  return result.match(
    (validatedData) => {
      return Response.json(validatedData);
    },
    (error) => {
      console.error("Error fetching job data:", error);
      return Response.json(
        { error: "Failed to fetch job data" },
        { status: 500 },
      );
    },
  );
}
