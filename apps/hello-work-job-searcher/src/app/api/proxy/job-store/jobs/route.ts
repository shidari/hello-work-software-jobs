import type { NextRequest } from "next/server";
import { jobStoreClientOnServer } from "@/app/store/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyName = searchParams.get("companyName") ?? undefined;
  const employeeCountGtRaw = searchParams.get("employeeCountGt");
  const employeeCountLtRaw = searchParams.get("employeeCountLt");
  const jobDescription = searchParams.get("jobDescription") ?? undefined;
  const jobDescriptionExclude =
    searchParams.get("jobDescriptionExclude") ?? undefined;

  const filter: Record<string, unknown> = {};
  if (companyName) filter.companyName = companyName;
  if (jobDescription) filter.jobDescription = jobDescription;
  if (jobDescriptionExclude)
    filter.jobDescriptionExclude = jobDescriptionExclude;

  filter.employeeCountGt = employeeCountGtRaw ?? undefined;
  filter.employeeCountLt = employeeCountLtRaw ?? undefined;
  filter.orderByReceiveDate = "desc";

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
