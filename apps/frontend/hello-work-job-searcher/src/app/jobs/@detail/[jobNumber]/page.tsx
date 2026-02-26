import { JobDetail } from "@/components/features/detail/JobDetail";
import { jobStoreClient } from "@/job-store-fetcher";

interface PageProps {
  params: Promise<{ jobNumber: string }>;
}

export default async function Page({ params }: PageProps) {
  const { jobNumber } = await params;

  const res = await jobStoreClient.api.v1.jobs[":jobNumber"].$get({
    param: { jobNumber },
  });
  const data = await res.json();
  if (!data) {
    return <div>求人情報が見つかりませんでした。</div>;
  }

  return <JobDetail jobDetail={data} />;
}
