export const dynamic = "force-dynamic";

import { jobStoreClient } from "@/lib/backend-client";
import { HydratedJobsPage } from "./HydratedJobsPage";

export default async function Page() {
  const res = await jobStoreClient.jobs.$get({
    query: { orderByReceiveDate: "desc" },
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
    />
  );
}
