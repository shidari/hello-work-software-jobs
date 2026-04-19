export const dynamic = "force-dynamic";

import { Effect } from "effect";
import { jobStoreClient } from "#lib/backend-client";
import { runLog } from "@/lib/log";
import { CompanyDetailPage } from "./CompanyDetailPage_client";

export default async function Page({
  params,
}: {
  params: Promise<{ establishmentNumber: string }>;
}) {
  const { establishmentNumber } = await params;

  const res = await jobStoreClient.companies[":establishmentNumber"].$get({
    param: { establishmentNumber },
  });
  if (!res.ok) {
    await runLog(
      Effect.logError("fetch company detail failed").pipe(
        Effect.annotateLogs({ establishmentNumber, status: res.status }),
      ),
    );
    if (res.status === 404) {
      return <div>事業所が見つかりませんでした。</div>;
    }
    return <div>事業所情報の取得に失敗しました。</div>;
  }
  const company = await res.json();

  const jobsRes = await jobStoreClient.jobs.$get({
    query: { establishmentNumber, orderByReceiveDate: "desc" },
  });
  const jobs = jobsRes.ok ? (await jobsRes.json()).jobs : [];

  return <CompanyDetailPage company={company} jobs={jobs} />;
}
