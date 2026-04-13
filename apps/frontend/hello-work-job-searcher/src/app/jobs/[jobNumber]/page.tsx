export const dynamic = "force-dynamic";

import { jobStoreClient } from "#lib/backend-client";
import { JobDetailPage } from "./JobDetailPage_client";

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

  const relatedJobs = job.companyName
    ? await jobStoreClient.jobs
        .$get({ query: { companyName: job.companyName } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) =>
          data ? data.jobs.filter((j) => j.jobNumber !== job.jobNumber) : [],
        )
        .catch(() => [])
    : [];

  return <JobDetailPage job={job} relatedJobs={relatedJobs} />;
}
