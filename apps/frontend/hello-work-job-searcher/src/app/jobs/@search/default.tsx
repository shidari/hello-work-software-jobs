export const dynamic = "force-dynamic";

import { jobStoreClient } from "@/app/api/[[...route]]/route";
import { HydratedJobOverviewList } from "@/components/features/list/JobOverviewList";
import { JobsSearchfilter } from "@/components/features/list/JobSearchFilter";
import { JobtotalCount } from "@/components/features/list/JobTotalCount";
import { Accordion } from "@/components/ui/Accordion";
import styles from "./page.module.css";

export default async function Page() {
  const res = await jobStoreClient.api.v1.jobs.$get({
    query: { orderByReceiveDate: "desc" },
  });
  if (!res.ok) {
    console.error("Failed to fetch jobs:", res.status);
    return <div>求人情報の取得に失敗しました。</div>;
  }
  const data = await res.json();
  return (
    <div className={styles["layout-search"]}>
      <div className={styles["layout-search-header"]}>
        <h1
          className={`${styles["header-title"]} ${styles["header-title--primary"]}`}
        >
          求人情報一覧
        </h1>
        <JobtotalCount initialDataFromServer={data.meta.totalCount} />
        <Accordion title="絞り込み">
          <JobsSearchfilter />
        </Accordion>
      </div>

      <div className={styles["layout-search-list"]}>
        <HydratedJobOverviewList
          initialDataFromServer={{
            jobs: data.jobs,
            nextToken: data.nextToken,
            totalCount: data.meta.totalCount,
          }}
        />
      </div>
    </div>
  );
}
