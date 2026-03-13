export const dynamic = "force-dynamic";

import { jobStoreClient } from "@/lib/backend-client";
import { JobDetailPage } from "./JobDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ jobNumber: string }>;
}) {
  const { jobNumber } = await params;
  const res = await jobStoreClient.jobs[":jobNumber"].$get({
    param: { jobNumber },
  });
  if (!res.ok) {
    console.error("Failed to fetch job detail:", res.status);
    return <div>求人情報の取得に失敗しました。</div>;
  }
  const job = await res.json();
  if (!job) {
    return <div>求人が見つかりませんでした。</div>;
  }
  return <JobDetailPage job={job} />;
}
