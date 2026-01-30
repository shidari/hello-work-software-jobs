import { jobStoreClientOnServer } from "../_job-store-fetcher";
import { ClientComponent } from "./_clientComponent";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const s = await searchParams;
  const d = s["date"];
  const dateStr = Array.isArray(d)
    ? d[0]
    : d ||
      (() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        return todayStr;
      })();
  const data = (
    await jobStoreClientOnServer.getInitialJobs({
      addedSince: `${dateStr}`,
      addedUntil: `${dateStr}`,
    })
  )._unsafeUnwrap();
  return (
    <ClientComponent
      initialCount={data.meta.totalCount}
      initialDateStr={dateStr}
    />
  );
}
