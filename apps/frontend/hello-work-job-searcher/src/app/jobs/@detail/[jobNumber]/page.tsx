import { JobDetail } from "@/components/features/detail/JobDetail";
import { jobStoreClient } from "@/lib/backend-client";

interface PageProps {
  params: Promise<{ jobNumber: string }>;
}

export default async function Page({ params }: PageProps) {
  const { jobNumber } = await params;

  const res = await jobStoreClient.jobs[":jobNumber"].$get({
    param: { jobNumber },
  });
  if (!res.ok) {
    return <div>求人情報が見つかりませんでした。</div>;
  }
  const data = await res.json();

  return <JobDetail jobDetail={data} />;
}
