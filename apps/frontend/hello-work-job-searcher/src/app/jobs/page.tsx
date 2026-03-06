export const dynamic = "force-dynamic";

import type { SearchFilter } from "@/atom";
import { jobStoreClient } from "@/lib/backend-client";
import { HydratedJobsPage } from "./HydratedJobsPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const str = (key: string) => {
    const v = params[key];
    return typeof v === "string" && v ? v : undefined;
  };

  const filter: SearchFilter = {
    ...(str("companyName") && { companyName: str("companyName") }),
    ...(str("jobDescription") && { jobDescription: str("jobDescription") }),
    ...(str("jobDescriptionExclude") && {
      jobDescriptionExclude: str("jobDescriptionExclude"),
    }),
    ...(str("employeeCountGt") && { employeeCountGt: str("employeeCountGt") }),
    ...(str("employeeCountLt") && { employeeCountLt: str("employeeCountLt") }),
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
