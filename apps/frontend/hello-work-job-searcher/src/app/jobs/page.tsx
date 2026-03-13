export const dynamic = "force-dynamic";

import type { SearchFilter } from "@/atom/atoms";
import { jobStoreClient } from "@/lib/backend-client";
import { HydratedJobsPage } from "./HydratedJobsPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filter: SearchFilter = {
    companyName:
      typeof params.companyName === "string" ? params.companyName : undefined,
    jobDescription:
      typeof params.jobDescription === "string"
        ? params.jobDescription
        : undefined,
    jobDescriptionExclude:
      typeof params.jobDescriptionExclude === "string"
        ? params.jobDescriptionExclude
        : undefined,
    employeeCountGt:
      typeof params.employeeCountGt === "string"
        ? params.employeeCountGt
        : undefined,
    employeeCountLt:
      typeof params.employeeCountLt === "string"
        ? params.employeeCountLt
        : undefined,
  };

  const { onlyNotExpired: _, ...queryFilter } = filter;
  const res = await jobStoreClient.jobs.$get({
    query: { ...queryFilter, orderByReceiveDate: "desc" },
  });
  if (!res.ok) {
    console.error("Failed to fetch jobs:", res.status);
    return <div>求人情報の取得に失敗しました。</div>;
  }
  const data = await res.json();
  return (
    <HydratedJobsPage
      initialData={{
        jobs: data.jobs,
        page: data.meta.page,
        totalPages: data.meta.totalPages,
        totalCount: data.meta.totalCount,
      }}
      initialFilter={filter}
    />
  );
}
