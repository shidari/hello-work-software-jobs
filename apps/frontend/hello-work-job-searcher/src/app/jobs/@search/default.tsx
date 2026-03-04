export const dynamic = "force-dynamic";

import { HydratedJobOverviewList } from "@/components/features/list/JobOverviewList";
import { JobsSearchfilter } from "@/components/features/list/JobSearchFilter";
import { JobtotalCount } from "@/components/features/list/JobTotalCount";
import { Collapsible } from "@/components/ui/Collapsible";
import { jobStoreClient } from "@/lib/backend-client";
import styles from "./page.module.css";

export default async function Page() {
  const res = await jobStoreClient.api.jobs.$get({
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
        <div className={styles.totalCount}>
          <JobtotalCount initialDataFromServer={data.meta.totalCount} />
        </div>
        <Collapsible title="絞り込み">
          <JobsSearchfilter />
        </Collapsible>
      </div>

      <div className={styles["layout-search-list"]}>
        <HydratedJobOverviewList
          initialDataFromServer={{
            jobs: data.jobs,
            page: data.meta.page,
            totalPages: data.meta.totalPages,
            totalCount: data.meta.totalCount,
          }}
        />
      </div>
    </div>
  );
}
